"""
AI Learning Roadmap — BYOK LLM Proxy
Pure passthrough: holds no API keys. Users supply their own DeepSeek key
via X-User-Key header; the proxy forwards it to DeepSeek and streams back
the response. The key is never logged, stored, or persisted.
"""
import json
import logging
import os
import time
from collections import defaultdict
from typing import AsyncIterator

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

load_dotenv()

# ── Config ────────────────────────────────────────────────────────────────────

DEEPSEEK_BASE_URL = os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1")

ALLOWED_MODELS  = {"deepseek-chat", "deepseek-reasoner"}
DEFAULT_MODEL   = "deepseek-chat"
MAX_TOKENS_CAP  = int(os.environ.get("MAX_TOKENS_CAP", "2048"))
MAX_BODY_BYTES  = int(os.environ.get("MAX_BODY_BYTES", "65536"))   # 64 KB
MAX_MSG_CHARS   = int(os.environ.get("MAX_MSG_CHARS", "16000"))

RATE_IP_LIMIT   = int(os.environ.get("RATE_IP_LIMIT", "30"))       # per minute per IP
RATE_IP_WINDOW  = 60

ALLOWED_ORIGINS = set(filter(None, os.environ.get(
    "ALLOWED_ORIGINS",
    "https://sunying2929894050-max.github.io,http://localhost:8080,http://localhost:8765"
).split(",")))

# ── Logging ───────────────────────────────────────────────────────────────────
# IMPORTANT: key values must never appear in any log call below.

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
log = logging.getLogger("llm-proxy")

# ── Per-IP rate-limit state (in-process) ─────────────────────────────────────
# For multi-worker deployments replace with Redis.

_ip_buckets: dict[str, list[float]] = defaultdict(list)


def _check_ip_rate(ip: str) -> bool:
    """Return True if under limit, False if over."""
    now    = time.monotonic()
    cutoff = now - RATE_IP_WINDOW
    hits   = _ip_buckets[ip]
    hits[:] = [t for t in hits if t > cutoff]
    if len(hits) >= RATE_IP_LIMIT:
        return False
    hits.append(now)
    return True


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="LLM Proxy (BYOK)",
    docs_url=None,
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(ALLOWED_ORIGINS),
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-User-Key"],
    allow_credentials=False,
    max_age=600,
)


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "mode": "byok"}


# ── LLM endpoint ─────────────────────────────────────────────────────────────

@app.api_route("/api/llm", methods=["GET", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"])
async def llm_wrong_method():
    return Response(status_code=405, headers={"Allow": "POST"})


@app.post("/api/llm")
async def llm(request: Request):
    client_ip = request.headers.get("X-Forwarded-For", request.client.host).split(",")[0].strip()

    # ── User key — required, never logged ────────────────────────────────────
    user_key = request.headers.get("X-User-Key", "").strip()
    if not user_key:
        return JSONResponse(
            {"error": "unauthorized", "message": "API key required. Pass your DeepSeek key in X-User-Key."},
            status_code=401,
        )

    # ── Per-IP rate limit (bandwidth abuse guard) ─────────────────────────────
    if not _check_ip_rate(client_ip):
        log.warning("IP_RATE_LIMIT ip=%s", client_ip)
        return JSONResponse(
            {"error": "rate_limited", "message": "Too many requests. Please wait a moment."},
            status_code=429,
            headers={"Retry-After": str(RATE_IP_WINDOW)},
        )

    # ── Body size ────────────────────────────────────────────────────────────
    body_bytes = await request.body()
    if len(body_bytes) > MAX_BODY_BYTES:
        return JSONResponse({"error": "payload_too_large", "message": "Request body too large."}, status_code=413)

    # ── Parse + validate ─────────────────────────────────────────────────────
    try:
        payload = json.loads(body_bytes)
    except json.JSONDecodeError:
        return JSONResponse({"error": "bad_request", "message": "Invalid JSON."}, status_code=400)

    messages = payload.get("messages")
    if not isinstance(messages, list) or not messages:
        return JSONResponse(
            {"error": "bad_request", "message": "'messages' must be a non-empty array."},
            status_code=400,
        )

    total_chars = sum(len(str(m.get("content", ""))) for m in messages)
    if total_chars > MAX_MSG_CHARS:
        return JSONResponse(
            {"error": "payload_too_large", "message": f"Total message characters exceed {MAX_MSG_CHARS}."},
            status_code=413,
        )

    # Model whitelist + max_tokens clamp
    requested_model = payload.get("model", DEFAULT_MODEL)
    model = requested_model if requested_model in ALLOWED_MODELS else DEFAULT_MODEL
    if requested_model not in ALLOWED_MODELS:
        log.info("MODEL_FALLBACK requested=%s -> %s ip=%s", requested_model, model, client_ip)

    max_tokens = min(int(payload.get("max_tokens", MAX_TOKENS_CAP)), MAX_TOKENS_CAP)

    log.info("LLM_CALL ip=%s model=%s max_tokens=%d msgs=%d chars=%d",
             client_ip, model, max_tokens, len(messages), total_chars)

    # ── Build upstream request (key used here, never touched again) ───────────
    upstream_payload = {
        "model":      model,
        "messages":   messages,
        "max_tokens": max_tokens,
        "stream":     True,
    }
    upstream_headers = {
        "Authorization": f"Bearer {user_key}",   # user_key not logged anywhere
        "Content-Type":  "application/json",
        "Accept":        "text/event-stream",
    }
    # Immediately rebind so the key name is out of scope after this point
    del user_key

    # ── Stream DeepSeek → client ──────────────────────────────────────────────
    async def stream_upstream() -> AsyncIterator[bytes]:
        try:
            async with httpx.AsyncClient(timeout=60) as http:
                async with http.stream(
                    "POST",
                    f"{DEEPSEEK_BASE_URL}/chat/completions",
                    json=upstream_payload,
                    headers=upstream_headers,
                ) as resp:
                    if resp.status_code == 401:
                        log.warning("UPSTREAM_AUTH_FAIL ip=%s", client_ip)
                        yield b'data: {"error":"invalid_key","message":"Invalid or expired API key."}\n\n'
                        return
                    if resp.status_code != 200:
                        body = await resp.aread()
                        log.error("UPSTREAM_ERROR status=%d ip=%s", resp.status_code, client_ip)
                        # body may contain upstream error text — don't forward it raw
                        yield b'data: {"error":"upstream_error","message":"Upstream request failed."}\n\n'
                        return
                    async for chunk in resp.aiter_bytes(1024):
                        yield chunk
        except httpx.TimeoutException:
            log.error("UPSTREAM_TIMEOUT ip=%s", client_ip)
            yield b'data: {"error":"timeout","message":"Upstream timed out."}\n\n'
        except Exception as exc:
            log.error("UPSTREAM_EXCEPTION ip=%s type=%s", client_ip, type(exc).__name__)
            yield b'data: {"error":"internal_error","message":"An internal error occurred."}\n\n'

    return StreamingResponse(
        stream_upstream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control":    "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
