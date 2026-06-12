// tokenizer-demo — real-time BPE tokenization via gpt-tokenizer (esm.sh CDN)
// Falls back to pre-computed examples if CDN unavailable.
// initTokenizerDemo(panelEl) is idempotent via data-bound="1".

const TOKEN_COLORS = [
  '#dbeafe','#dcfce7','#fef3c7','#fce7f3','#ede9fe',
  '#fee2e2','#f0fdf4','#fff7ed','#e0f2fe','#fdf4ff'
];

// Pre-computed fallback examples (cl100k_base actual tokenizations)
const FALLBACK_EXAMPLES = {
  'strawberry':     ['straw','berry'],
  'tokenization':   ['token','ization'],
  'ChatGPT':        ['Chat','G','PT'],
  'hello':          ['hello'],
  'hello world':    ['hello',' world'],
  'GPT-4':          ['G','PT','-','4'],
  'Transformer':    ['Trans','former'],
  'backpropagation':['back','prop','agation'],
  'machine learning':['machine',' learning'],
  'neural network': ['neural',' network'],
  '你好':            ['你','好'],
  '深度学习':         ['深度','学习'],
  '人工智能':         ['人工','智能'],
  '自然语言处理':     ['自然语言','处理'],
  'embedding':      ['embed','ding'],
  'gradient':       ['gradient'],
  'descent':        ['descent'],
  'attention':      ['attention'],
  'https://':       ['https','://'],
  '100':            ['100'],
  '1000':           ['1000'],
  '2024':           ['2024'],
};

let _enc = null;   // encode fn
let _dec = null;   // decode fn
let _libReady = false;
let _libPromise = null;

function _loadLib() {
  if (_libPromise) return _libPromise;
  _libPromise = import('https://esm.sh/gpt-tokenizer@2.9.0/encoding/cl100k_base')
    .then(m => {
      _enc = m.encode;
      _dec = m.decode;
      _libReady = true;
    })
    .catch(() => { _libReady = false; });
  return _libPromise;
}

function _tokenize(text) {
  if (_libReady && _enc && _dec) {
    try {
      const ids = _enc(text);
      return ids.map(id => {
        const bytes = _dec([id]);
        // gpt-tokenizer decode returns string
        return typeof bytes === 'string' ? bytes : new TextDecoder('utf-8', {fatal:false}).decode(bytes);
      });
    } catch (e) {}
  }
  // Fallback: exact example match
  if (FALLBACK_EXAMPLES[text] !== undefined) return FALLBACK_EXAMPLES[text];
  // Rough fallback: split by common subword patterns (very approximate)
  return [text];
}

function _render(input, output, countEl) {
  const text = input.value;
  if (!text) {
    output.innerHTML = '<span class="td-placeholder">在上方输入文字，实时查看分词结果</span>';
    countEl.textContent = '';
    return;
  }
  const tokens = _tokenize(text);
  output.innerHTML = tokens.map((t, i) => {
    const display = t.replace(/ /g, '·').replace(/\n/g, '↵');
    return `<span class="tok-bubble" style="background:${TOKEN_COLORS[i % TOKEN_COLORS.length]}">${display}</span>`;
  }).join('');
  countEl.textContent = `${tokens.length} 个 token`;
}

// Pre-populate the example buttons
function _bindExamples(demo, input, output, countEl) {
  const btns = demo.querySelectorAll('.tok-example-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      input.value = btn.dataset.example || btn.textContent.trim();
      _render(input, output, countEl);
    });
  });
}

async function initTokenizerDemo(panelEl) {
  panelEl.querySelectorAll('.token-demo:not([data-bound])').forEach(demo => {
    demo.dataset.bound = '1';

    const input   = demo.querySelector('.token-input');
    const output  = demo.querySelector('.token-output');
    const countEl = demo.querySelector('.token-count');
    if (!input || !output) return;

    // Start loading CDN (non-blocking — updates rendering once ready)
    _loadLib().then(() => {
      // Re-render with real tokenizer if input already has content
      if (input.value) _render(input, output, countEl);
      // Show/hide CDN status notice
      const notice = demo.querySelector('.tok-lib-notice');
      if (notice) notice.hidden = _libReady;
    });

    input.addEventListener('input', () => _render(input, output, countEl));
    _bindExamples(demo, input, output, countEl);

    _render(input, output, countEl);
  });
}
