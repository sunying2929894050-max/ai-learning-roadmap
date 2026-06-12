"""
AI Learning Roadmap — LLM Proxy
Forwards requests to DeepSeek, enforces rate limits, clamps parameters.
"""
import json
import logging
import os
import time
from collections import defaultdict
from datetime import datetime, timezone
from typing import AsyncIterator

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

load_dotenv()

# ── Config ────────────────────────────────────────────────────────────────────

DEEPSEEK_API_KEY  = os.environ.get("DEEPSEEK_API_KEY", "")
DEEPSEEK_BASE_URL = os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1")

ALLOWED_MODELS    = {"deepseek-chat", "deepseek-reasoner"}
DEFAULT_MODEL     = "deepseek-chat"
MAX_TOKENS_CAP    = int(os.environ.get("MAX_TOKENS_CAP", "1024"))
MAX_BODY_BYTES    = int(os.environ.get("MAX_BODY_BYTES", "32768"))   # 32 KB
MAX_MSG_CHARS     = int(os.environ.get("MAX_MSG_CHARS", "8000"))

RATE_IP_LIMIT     = int(os.environ.get("RATE_IP_LIMIT", "10"))       # per minute
RATE_IP_WINDOW    = 60                                                 # seconds
RATE_DAILY_LIMIT  = int(os.environ.get("RATE_DAILY_LIMIT", "2000"))  # global/day

ALLOWED_ORIGINS   = set(filter(None, os.environ.get(
    "ALLOWED_ORIGINS",
    "https://sunying2929894050-max.github.io,http://localhost:8080,http://localhost:8765"
).split(",")))

# ── Logging ───────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
log = logging.getLogger("llm-proxy")

# ── Rate-limit state (in-process; survives only for process lifetime) ──────────
# For multi-worker deployments replace with Redis.

_ip_buckets: dict[str, list[float]] = defaultdict(list)   # IP → [timestamps]
_daily: dict[str, int]              = {}                   # "YYYY-MM-DD" → count
_daily_throttled: dict[str, int]    = {}                   # "YYYY-MM-DD" → throttle hits


def _today() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _daily_count() -> int:
    return _daily.get(_today(), 0)


def _increment_daily() -> int:
    key = _today()
    _daily[key] = _daily.get(key, 0) + 1
    return _daily[key]


def _check_ip_rate(ip: str) -> bool:
    """Return True if under limit, False if rate-limited."""
    now   = time.monotonic()
    cutoff = now - RATE_IP_WINDOW
    hits  = _ip_buckets[ip]
    # Purge old entries
    hits[:] = [t for t in hits if t > cutoff]
    if len(hits) >= RATE_IP_LIMIT:
        return False
    hits.append(now)
    return True


def _check_daily_rate() -> bool:
    if _daily_count() >= RATE_DAILY_LIMIT:
        key = _today()
        _daily_throttled[key] = _daily_throttled.get(key, 0) + 1
        log.warning("DAILY LIMIT HIT — throttled=%d today=%s", _daily_throttled[key], key)
        return False
    return True


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="LLM Proxy",
    docs_url=None,   # disable public Swagger
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(ALLOWED_ORIGINS),
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
    allow_credentials=False,
    max_age=600,
)


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    today = _today()
    return {
        "status": "ok",
        "daily_calls": _daily.get(today, 0),
        "daily_throttled": _daily_throttled.get(today, 0),
        "daily_limit": RATE_DAILY_LIMIT,
    }


# ── LLM endpoint ─────────────────────────────────────────────────────────────

@app.api_route("/api/llm", methods=["GET", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"])
async def llm_wrong_method():
    return Response(status_code=405, headers={"Allow": "POST"})


@app.post("/api/llm")
async def llm(request: Request):
    client_ip = request.headers.get("X-Forwarded-For", request.client.host).split(",")[0].strip()

    # ── Global daily limit ───────────────────────────────────────────────────
    if not _check_daily_rate():
        log.warning("DAILY_LIMIT ip=%s", client_ip)
        return JSONResponse(
            {"error": "service_unavailable", "message": "Daily limit reached. Try again tomorrow."},
            status_code=429,
            headers={"Retry-After": "86400"},
        )

    # ── Per-IP rate limit ────────────────────────────────────────────────────
    if not _check_ip_rate(client_ip):
        log.warning("IP_RATE_LIMIT ip=%s", client_ip)
        return JSONResponse(
            {"error": "rate_limited", "message": "Too many requests. Please wait a moment."},
            status_code=429,
            headers={"Retry-After": str(RATE_IP_WINDOW)},
        )

    # ── Body size check ──────────────────────────────────────────────────────
    body_bytes = await request.body()
    if len(body_bytes) > MAX_BODY_BYTES:
        return JSONResponse(
            {"error": "payload_too_large", "message": "Request body too large."},
            status_code=413,
        )

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

    # Total characters guard
    total_chars = sum(len(str(m.get("content", ""))) for m in messages)
    if total_chars > MAX_MSG_CHARS:
        return JSONResponse(
            {"error": "payload_too_large",
             "message": f"Total message characters exceed {MAX_MSG_CHARS}."},
            status_code=413,
        )

    # Model whitelist
    requested_model = payload.get("model", DEFAULT_MODEL)
    model = requested_model if requested_model in ALLOWED_MODELS else DEFAULT_MODEL
    if requested_model not in ALLOWED_MODELS:
        log.info("MODEL_FALLBACK requested=%s -> %s ip=%s", requested_model, model, client_ip)

    # max_tokens clamp
    client_max_tokens = payload.get("max_tokens", MAX_TOKENS_CAP)
    max_tokens = min(int(client_max_tokens), MAX_TOKENS_CAP)

    # ── Build upstream request ────────────────────────────────────────────────
    upstream_payload = {
        "model":      model,
        "messages":   messages,
        "max_tokens": max_tokens,
        "stream":     True,
    }
    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type":  "application/json",
        "Accept":        "text/event-stream",
    }

    _increment_daily()
    log.info(
        "LLM_CALL ip=%s model=%s max_tokens=%d msgs=%d chars=%d daily=%d",
        client_ip, model, max_tokens, len(messages), total_chars, _daily_count(),
    )

    # ── Stream from DeepSeek → client ─────────────────────────────────────────
    async def stream_upstream() -> AsyncIterator[bytes]:
        try:
            async with httpx.AsyncClient(timeout=60) as client:
                async with client.stream(
                    "POST",
                    f"{DEEPSEEK_BASE_URL}/chat/completions",
                    json=upstream_payload,
                    headers=headers,
                ) as resp:
                    if resp.status_code != 200:
                        body = await resp.aread()
                        log.error("UPSTREAM_ERROR status=%d body=%s", resp.status_code, body[:200])
                        yield b"data: {\"error\":\"upstream_error\"}\n\n"
                        return
                    async for chunk in resp.aiter_bytes(1024):
                        yield chunk
        except httpx.TimeoutException:
            log.error("UPSTREAM_TIMEOUT ip=%s", client_ip)
            yield b"data: {\"error\":\"upstream_timeout\"}\n\n"
        except Exception as exc:
            log.error("UPSTREAM_EXCEPTION ip=%s exc=%r", client_ip, exc)
            yield b"data: {\"error\":\"internal_error\"}\n\n"

    return StreamingResponse(
        stream_upstream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # disable nginx buffering for SSE
        },
    )
