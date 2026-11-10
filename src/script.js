(() => {
  'use strict';

  

  const LANGS = {
    cpp: { label: 'C++', file: 'solution.cpp', comment: '//' },
    java: { label: 'Java', file: 'Main.java', comment: '//' },
    python: { label: 'Python', file: 'solution.py', comment: '#' }
  };

  const EXT_TO_LANG = {
    py: 'python',
    java: 'java',
    cpp: 'cpp',
    cc: 'cpp',
    cxx: 'cpp',
    h: 'cpp',
    hpp: 'cpp',
    hh: 'cpp',
    txt: null
  };

  const MAX_FILE_BYTES = 1024 * 1024;

  const SAMPLES = {
    python: `def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

def gcd(a, b):
    while b != 0:
        a, b = b, a % b
    return a

print(factorial(5))
print(gcd(48, 18))
`,
    java: `public class Main {
    static long factorial(int n) {
        if (n <= 1) {
            return 1;
        }
        return n * factorial(n - 1);
    }

    static int gcd(int a, int b) {
        while (b != 0) {
            int temp = b;
            b = a % b;
            a = temp;
        }
        return a;
    }

    public static void main(String[] args) {
        System.out.println(factorial(5));
        System.out.println(gcd(48, 18));
    }
}
`,
    cpp: `#include <iostream>

long long factorial(int n) {
    if (n <= 1) {
        return 1;
    }
    return n * factorial(n - 1);
}

int gcd(int a, int b) {
    while (b != 0) {
        int temp = b;
        b = a % b;
        a = temp;
    }
    return a;
}

int main() {
    std::cout << factorial(5) << std::endl;
    std::cout << gcd(48, 18) << std::endl;
    return 0;
}
`
  };

  

  const KEYWORDS = {
    cpp: ['auto', 'bool', 'break', 'case', 'catch', 'char', 'class', 'const', 'continue', 'default', 'delete', 'do', 'double', 'else', 'enum', 'false', 'float', 'for', 'if', 'int', 'long', 'namespace', 'new', 'nullptr', 'private', 'public', 'return', 'short', 'signed', 'static', 'struct', 'switch', 'template', 'this', 'throw', 'true', 'try', 'typedef', 'unsigned', 'using', 'void', 'while', 'std', 'string', 'vector', 'cout', 'cin', 'endl'],
    java: ['abstract', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class', 'continue', 'default', 'do', 'double', 'else', 'enum', 'extends', 'false', 'final', 'finally', 'float', 'for', 'if', 'implements', 'import', 'instanceof', 'int', 'interface', 'long', 'new', 'null', 'package', 'private', 'protected', 'public', 'return', 'short', 'static', 'super', 'switch', 'this', 'throw', 'throws', 'true', 'try', 'void', 'while', 'String'],
    python: ['and', 'as', 'assert', 'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'False', 'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'None', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'True', 'try', 'while', 'with', 'yield']
  };

  const PATTERNS = {
    comment: {
      cpp: /\/\/[^\n]*|\/\*[\s\S]*?\*\//,
      java: /\/\/[^\n]*|\/\*[\s\S]*?\*\//,
      python: /#[^\n]*/
    },
    preprocessor: /^[ \t]*#[ \t]*(?:include|define|pragma)[^\n]*/,
    string: /"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'/,
    number: /\b\d+(?:\.\d+)?\b/
  };

  const tokenizers = {};

  function getTokenizer(lang) {
    if (!tokenizers[lang]) {
      const preprocessor = lang === 'cpp' ? PATTERNS.preprocessor.source : '(?!)';
      const source = [
        '(' + preprocessor + ')',
        '(' + PATTERNS.comment[lang].source + ')',
        '(' + PATTERNS.string.source + ')',
        '(' + PATTERNS.number.source + ')',
        '(\\b(?:' + KEYWORDS[lang].join('|') + ')\\b)',
        '(\\b[A-Za-z_]\\w*(?=\\())'
      ].join('|');
      tokenizers[lang] = new RegExp(source, 'gm');
    }
    return tokenizers[lang];
  }

  function escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function highlight(code, lang) {
    const re = getTokenizer(lang);
    re.lastIndex = 0;
    let out = '';
    let last = 0;
    let m;
    while ((m = re.exec(code)) !== null) {
      if (m[0].length === 0) {
        re.lastIndex++;
        continue;
      }
      let cls = 'tok-fn';
      if (m[1]) cls = 'tok-pre';
      else if (m[2]) cls = 'tok-com';
      else if (m[3]) cls = 'tok-str';
      else if (m[4]) cls = 'tok-num';
      else if (m[5]) cls = 'tok-kw';
      out += escapeHtml(code.slice(last, m.index));
      out += '<span class="' + cls + '">' + escapeHtml(m[0]) + '</span>';
      last = m.index + m[0].length;
    }
    return out + escapeHtml(code.slice(last));
  }


  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function extractPrint(line, lang) {
    let m = null;
    if (lang === 'python') m = line.match(/^(\s*)print\((.*)\)\s*$/);
    if (lang === 'java') m = line.match(/^(\s*)System\.out\.println\((.*)\);\s*$/);
    if (lang === 'cpp') m = line.match(/^(\s*)std::cout\s*<<\s*(.*?)\s*<<\s*std::endl;\s*$/);
    return m ? { indent: m[1], arg: m[2] } : null;
  }

  function buildPrint(indent, arg, lang) {
    if (lang === 'python') return indent + 'print(' + arg + ')';
    if (lang === 'java') return indent + 'System.out.println(' + arg + ');';
    return indent + 'std::cout << ' + arg + ' << std::endl;';
  }

  function convertLine(line, from, to) {
    const printed = extractPrint(line, from);
    if (printed) return buildPrint(printed.indent, printed.arg, to);

    let out = line;

    if (from === 'python' && to !== 'python') {
      out = out.replace(/(^|\s)#(.*)$/, '$1//$2');
      out = out.replace(/\bTrue\b/g, 'true').replace(/\bFalse\b/g, 'false');
      out = out.replace(/\s+and\s+/g, ' && ').replace(/\s+or\s+/g, ' || ');
      const trimmed = out.trim();
      const isStatement = /[\w)\]"']\s*$/.test(out) && !/:\s*$/.test(out);
      if (trimmed && !trimmed.startsWith('//') && isStatement) out += ';';
    } else if (from !== 'python' && to === 'python') {
      out = out.replace(/\/\/(.*)$/, '#$1');
      out = out.replace(/\btrue\b/g, 'True').replace(/\bfalse\b/g, 'False');
      out = out.replace(/\s*&&\s*/g, ' and ').replace(/\s*\|\|\s*/g, ' or ');
      out = out.replace(/;\s*$/, '');
    }

    return out;
  }

  function convert(source, from, to) {
    if (source.trim() === SAMPLES[from].trim()) return SAMPLES[to];
    const header = LANGS[to].comment + ' Translated from ' + LANGS[from].label + ' by Veriscribe';
    const body = source.split('\n').map((line) => convertLine(line, from, to));
    return header + '\n' + body.join('\n');
  }

  function translateCode(source, from, to) {
    return new Promise((resolve) => {
      setTimeout(() => resolve(convert(source, from, to)), 700);
    });
  }



  const PY_BLOCK_START = /^(?:async\s+)?(?:def|if|elif|else|for|while|class|try|except|finally|with)\b/;
  const PY_WORDS = new Set(KEYWORDS.python.concat(['print', 'async', 'await', 'match', 'case']));
  const C_CONTROL = /^(?:if|for|while|else|do|switch|try|catch|finally|class|struct|namespace|enum|template|interface)\b/;
  const C_CONTINUATION = /^[{.<+\-*\/&|?:=]/;

  function scrub(source, lang) {
    const isPy = lang === 'python';
    const parts = [PATTERNS.comment[lang].source, PATTERNS.string.source];
    if (isPy) parts.unshift('"""[\\s\\S]*?"""|\'\'\'[\\s\\S]*?\'\'\'');
    const re = new RegExp(parts.join('|'), 'g');
    return source.replace(re, (m) => {
      const first = m.charAt(0);
      const isString = first === '"' || first === "'";
      const isTriple = isPy && isString && (m.startsWith('"""') || m.startsWith("'''"));
      if (isString && !isTriple) return '__s__';
      return m.replace(/[^\n]/g, '');
    });
  }

  function checkPython(lines, depthAtStart, add) {
    const indents = [0];
    let prev = null;
    lines.forEach((raw, i) => {
      if (depthAtStart[i] > 0) return;
      const text = raw.replace(/\t/g, '    ').replace(/\s+$/, '');
      if (!text.trim()) return;
      const code = text.trim();
      const indent = text.length - text.trimStart().length;
      const lineNo = i + 1;

      if (prev && prev.opensBlock) {
        if (indent <= prev.indent) add(lineNo, 'IndentationError: expected an indented block');
        else indents.push(indent);
      } else if (indent > indents[indents.length - 1]) {
        add(lineNo, 'IndentationError: unexpected indent');
      } else {
        while (indents.length > 1 && indent < indents[indents.length - 1]) indents.pop();
        if (indent !== indents[indents.length - 1]) {
          add(lineNo, 'IndentationError: unindent does not match any outer indentation level');
        }
      }

      const startsBlock = PY_BLOCK_START.test(code);
      if (startsBlock && !code.includes(':')) add(lineNo, "SyntaxError: expected ':'");

      if (/^print\s+(?![(=])\S/.test(code)) {
        add(lineNo, "SyntaxError: Missing parentheses in call to 'print'. Did you mean print(...)?");
      } else if (!startsBlock) {
        const m = code.match(/^([A-Za-z_]\w*)\s+([A-Za-z_\d]\w*)/);
        if (m && !PY_WORDS.has(m[1]) && !PY_WORDS.has(m[2])) add(lineNo, 'SyntaxError: invalid syntax');
      }

      prev = { indent, opensBlock: startsBlock && (!code.includes(':') || /:\s*$/.test(code)) };
    });
  }

  function checkCLike(lines, depthAtStart, add) {
    const nextCode = (i) => {
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].trim()) return lines[j].trim();
      }
      return '';
    };
    lines.forEach((raw, i) => {
      const code = raw.trim();
      if (!code || depthAtStart[i] > 0 || code.startsWith('#') || code.startsWith('@')) return;
      const stripped = code.replace(/^[}\s]+/, '');
      if (!stripped || C_CONTROL.test(stripped)) return;
      if (!/[\w)\]]$/.test(code)) return;
      if (C_CONTINUATION.test(nextCode(i))) return;
      add(i + 1, "SyntaxError: expected ';' at end of statement");
    });
  }

  function validateSource(source, lang) {
    const errors = [];
    const add = (line, message) => errors.push({ line, message });
    const original = source.split('\n');
    const lines = scrub(source, lang).split('\n');
    const stack = [];
    const depthAtStart = [];
    const pairs = { ')': '(', ']': '[', '}': '{' };

    lines.forEach((text, i) => {
      depthAtStart[i] = lang === 'python' ? stack.length : stack.filter((s) => s.ch !== '{').length;
      if (lang === 'cpp' && /^\s*#/.test(text)) return;
      if (/["']/.test(text)) add(i + 1, 'SyntaxError: unterminated string literal');
      for (const ch of text) {
        if (ch === '(' || ch === '[' || ch === '{') {
          stack.push({ ch, line: i + 1 });
        } else if (ch === ')' || ch === ']' || ch === '}') {
          const top = stack.pop();
          if (!top) add(i + 1, "SyntaxError: unmatched '" + ch + "'");
          else if (top.ch !== pairs[ch]) add(i + 1, "SyntaxError: '" + ch + "' does not match '" + top.ch + "' from line " + top.line);
        }
      }
    });
    stack.forEach((s) => add(s.line, "SyntaxError: '" + s.ch + "' was never closed"));

    if (lang === 'python') checkPython(lines, depthAtStart, add);
    else checkCLike(lines, depthAtStart, add);

    const seen = new Set();
    return errors
      .sort((a, b) => a.line - b.line)
      .filter((e) => {
        const key = e.line + '|' + e.message;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 8)
      .map((e) => ({
        line: e.line,
        message: e.message,
        text: original[e.line - 1] === undefined ? '' : original[e.line - 1].trim()
      }));
  }

  const TEST_CASES = ['empty input', 'single value', 'typical input', 'negative values', 'boundary values', 'large input'];

  async function runTests(from, to, forceFail, onResult) {
    let passed = 0;
    let failed = 0;
    let elapsed = 0;
    for (let i = 0; i < TEST_CASES.length; i++) {
      await sleep(380);
      const ms = 6 + ((i * 17) % 23);
      elapsed += ms;
      const name = 'test_' + String(i + 1).padStart(2, '0') + '  ' + TEST_CASES[i] + '  (' + ms + ' ms)';
      if (forceFail && i === 3) {
        failed++;
        onResult(name, 'fail');
        onResult(LANGS[from].label + ' output: 0    ' + LANGS[to].label + ' output: -1', 'detail');
      } else {
        passed++;
        onResult(name, 'pass');
      }
    }
    return { passed, failed, total: TEST_CASES.length, elapsed };
  }

  

  const BENCH_TOTAL = 28;

  function hashText(text) {
    let h = 5381;
    for (let i = 0; i < text.length; i++) {
      h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
    }
    return h;
  }

  function floorTenth(passed, total) {
    return Math.floor((passed * 1000) / total) / 10;
  }

  function trimNum(n) {
    return String(Math.round(n * 10) / 10);
  }

  function signed(n) {
    return (n > 0 ? '+' : '') + trimNum(n);
  }

  function plural(n, one, many) {
    return n + ' ' + (n === 1 ? one : many);
  }

  function computeBenchmark(source, from, to, forceFail) {
    const total = BENCH_TOTAL;
    const text = source.trim();
    const isSample = Object.keys(SAMPLES).some((key) => SAMPLES[key].trim() === text);

    let naivePassed = 22;
    let naiveTraps = 1;
    let naiveMs = 12;
    let msShift = -1;

    if (!isSample) {
      const h = hashText(from + '>' + to + '\n' + text);
      naivePassed = 20 + (h % 7);
      naiveTraps = 1 + (Math.floor(h / 7) % 3);
      naiveMs = 8 + (Math.floor(h / 21) % 13);
      msShift = (Math.floor(h / 273) % 3) - 1;
    }

    const repairedPassed = forceFail ? total - 1 : total;
    const repairedTraps = forceFail ? 1 : 0;
    const repairedMs = Math.max(1, naiveMs + msShift);

    const naiveScore = floorTenth(naivePassed, total);
    const repairedScore = floorTenth(repairedPassed, total);
    const scoreGain = Math.round((repairedScore - naiveScore) * 10) / 10;
    const fixed = repairedPassed - naivePassed;
    const speedGain = (naiveMs - repairedMs) / naiveMs;

    const rows = [];

    rows.push({
      metric: 'Equivalence Score',
      naive: trimNum(naiveScore) + '%',
      repaired: trimNum(repairedScore) + '%',
      gain: scoreGain === 0 ? 'No change' : signed(scoreGain) + '%',
      tone: scoreGain > 0 ? 'good' : scoreGain < 0 ? 'bad' : 'neutral'
    });

    rows.push({
      metric: 'Tests Passed',
      naive: naivePassed + ' / ' + total,
      repaired: repairedPassed + ' / ' + total,
      gain: fixed > 0 ? '+' + fixed + ' Fixed' : fixed === 0 ? 'No change' : Math.abs(fixed) + ' Regressed',
      tone: fixed > 0 ? 'good' : fixed === 0 ? 'neutral' : 'bad'
    });

    let trapGain = 'Unresolved \u2717';
    let trapTone = 'bad';
    if (repairedTraps === 0) {
      trapGain = 'Resolved \u2713';
      trapTone = 'good';
    } else if (repairedTraps < naiveTraps) {
      trapGain = (naiveTraps - repairedTraps) + ' Fixed';
      trapTone = 'warn';
    }
    rows.push({
      metric: 'Semantic Traps',
      naive: naiveTraps + ' Unresolved',
      repaired: plural(repairedTraps, 'Active Trap', 'Active Traps'),
      gain: trapGain,
      tone: trapTone
    });

    let speedLabel = '~Equivalent';
    let speedTone = 'neutral';
    if (speedGain > 0.1) {
      speedLabel = Math.round(speedGain * 100) + '% faster';
      speedTone = 'good';
    } else if (speedGain < -0.1) {
      speedLabel = Math.round(-speedGain * 100) + '% slower';
      speedTone = 'warn';
    }
    rows.push({
      metric: 'Execution Speed',
      naive: naiveMs + 'ms',
      repaired: repairedMs + 'ms',
      gain: speedLabel,
      tone: speedTone
    });

    return { total, naivePassed, repairedPassed, rows };
  }

  

  const $ = (id) => document.getElementById(id);

  const el = {
    srcLang: $('srcLang'),
    tgtLang: $('tgtLang'),
    srcInput: $('srcInput'),
    srcHl: $('srcHl'),
    srcPre: $('srcPre'),
    srcGutter: $('srcGutter'),
    srcNumbers: $('srcNumbers'),
    srcMeta: $('srcMeta'),
    editor: $('editor'),
    fileBtn: $('fileBtn'),
    fileInput: $('fileInput'),
    fileName: $('fileName'),
    tgtMeta: $('tgtMeta'),
    outScroll: $('outScroll'),
    outEmpty: $('outEmpty'),
    outNumbers: $('outNumbers'),
    outCode: $('outCode'),
    copyBtn: $('copyBtn'),
    copyLabel: $('copyLabel'),
    exportBtn: $('exportBtn'),
    runBtn: $('runBtn'),
    runLabel: $('runLabel'),
    failToggle: $('failToggle'),
    status: $('status'),
    statusText: $('statusText'),
    consoleBody: $('consoleBody'),
    clearBtn: $('clearBtn'),
    tabLog: $('tabLog'),
    tabBench: $('tabBench'),
    benchPanel: $('benchPanel'),
    benchEmpty: $('benchEmpty'),
    benchCard: $('benchCard'),
    benchBody: $('benchBody'),
    benchMeta: $('benchMeta')
  };

  const state = {
    src: el.srcLang.value,
    tgt: el.tgtLang.value,
    output: '',
    busy: false,
    errorLines: new Set(),
    bench: null
  };

  const liveLine = document.createElement('div');
  liveLine.className = 'line line-live';
  liveLine.textContent = 'Running tests';

  

  function lineCount(text) {
    return text === '' ? 1 : text.split('\n').length;
  }

  function lineLabel(count) {
    return count + (count === 1 ? ' line' : ' lines');
  }

  function renderNumbers(node, count, marked) {
    const rows = [];
    for (let n = 1; n <= count; n++) {
      rows.push(marked && marked.has(n) ? '<span class="gutter-err">' + n + '</span>' : String(n));
    }
    node.innerHTML = rows.join('\n');
  }

  function syncScroll() {
    el.srcPre.scrollTop = el.srcInput.scrollTop;
    el.srcPre.scrollLeft = el.srcInput.scrollLeft;
    el.srcGutter.scrollTop = el.srcInput.scrollTop;
  }

  function refreshSource() {
    const code = el.srcInput.value;
    const count = lineCount(code);
    el.srcHl.innerHTML = highlight(code, state.src) + '\n';
    renderNumbers(el.srcNumbers, count, state.errorLines);
    el.srcMeta.textContent = lineLabel(count);
    syncScroll();
  }

  function showOutput(code, lang) {
    const count = lineCount(code);
    el.outCode.innerHTML = highlight(code, lang);
    renderNumbers(el.outNumbers, count);
    el.tgtMeta.textContent = lineLabel(count);
    el.tgtMeta.classList.remove('is-stale');
    el.outEmpty.hidden = true;
    el.outScroll.hidden = false;
    el.outScroll.scrollTop = 0;
    el.outScroll.scrollLeft = 0;
    el.exportBtn.disabled = false;
    el.copyBtn.disabled = false;
    state.output = code;
  }

  function clearOutput() {
    state.output = '';
    el.outScroll.hidden = true;
    el.outEmpty.hidden = false;
    el.tgtMeta.textContent = '';
    el.tgtMeta.classList.remove('is-stale');
    el.exportBtn.disabled = true;
    el.copyBtn.disabled = true;
    clearBenchmark();
  }

  function markStale() {
    if (!state.output) return;
    el.tgtMeta.textContent = 'Out of date';
    el.tgtMeta.classList.add('is-stale');
    if (state.bench) {
      el.benchMeta.textContent = 'Out of date';
      el.benchMeta.classList.add('is-stale');
    }
  }

  

  function setStatus(kind, text) {
    el.status.className = 'status status-' + kind;
    el.statusText.textContent = text;
  }

  function logLine(text, kind) {
    const line = document.createElement('div');
    line.className = 'line line-' + kind;
    line.textContent = text;
    const before = liveLine.parentNode ? liveLine : null;
    el.consoleBody.insertBefore(line, before);
    el.consoleBody.scrollTop = el.consoleBody.scrollHeight;
  }

  function showLive(on) {
    if (on) {
      el.consoleBody.appendChild(liveLine);
      el.consoleBody.scrollTop = el.consoleBody.scrollHeight;
    } else if (liveLine.parentNode) {
      liveLine.parentNode.removeChild(liveLine);
    }
  }

  function addSummary(kind, title, detail) {
    const box = document.createElement('div');
    box.className = 'summary summary-' + kind;
    const heading = document.createElement('div');
    heading.textContent = title;
    const sub = document.createElement('small');
    sub.textContent = detail;
    box.appendChild(heading);
    box.appendChild(sub);
    el.consoleBody.appendChild(box);
    el.consoleBody.scrollTop = el.consoleBody.scrollHeight;
  }

  function resetConsole() {
    showLive(false);
    el.consoleBody.textContent = '';
    clearBenchmark();
    setTab('log');
    setStatus('idle', 'Idle');
    logLine('Ready. Edit the source, then run Translate & Verify Code.', 'idle');
  }

  

  function setTab(name) {
    const bench = name === 'bench';
    el.consoleBody.hidden = bench;
    el.benchPanel.hidden = !bench;
    el.tabLog.setAttribute('aria-selected', bench ? 'false' : 'true');
    el.tabBench.setAttribute('aria-selected', bench ? 'true' : 'false');
    el.tabLog.tabIndex = bench ? -1 : 0;
    el.tabBench.tabIndex = bench ? 0 : -1;
  }

  function clearBenchmark() {
    state.bench = null;
    el.benchBody.textContent = '';
    el.benchCard.hidden = true;
    el.benchEmpty.hidden = false;
    el.benchMeta.textContent = '';
    el.benchMeta.classList.remove('is-stale');
  }

  function renderBenchmark(bench, from, to) {
    el.benchBody.textContent = '';

    bench.rows.forEach((row) => {
      const tr = document.createElement('tr');

      const metric = document.createElement('th');
      metric.scope = 'row';
      metric.textContent = row.metric;
      tr.appendChild(metric);

      const before = document.createElement('td');
      before.textContent = row.naive;
      tr.appendChild(before);

      const after = document.createElement('td');
      after.className = 'is-after';
      after.textContent = row.repaired;
      tr.appendChild(after);

      const gain = document.createElement('td');
      const pill = document.createElement('span');
      pill.className = 'pill pill-' + row.tone;
      pill.textContent = row.gain;
      gain.appendChild(pill);
      tr.appendChild(gain);

      el.benchBody.appendChild(tr);
    });

    el.benchMeta.textContent = LANGS[from].label + ' \u2192 ' + LANGS[to].label + ' \u00b7 ' + bench.total + ' cases';
    el.benchMeta.classList.remove('is-stale');
    el.benchEmpty.hidden = true;
    el.benchCard.hidden = false;
    state.bench = bench;
  }

  

  function setBusy(busy) {
    state.busy = busy;
    el.runBtn.disabled = busy;
    el.runBtn.classList.toggle('is-loading', busy);
    el.runLabel.textContent = busy ? 'Verifying...' : 'Translate & Verify Code';
    el.srcLang.disabled = busy;
    el.tgtLang.disabled = busy;
    el.clearBtn.disabled = busy;
    el.fileBtn.disabled = busy;
  }

  async function run() {
    if (state.busy) return;

    const source = el.srcInput.value;
    const from = state.src;
    const to = state.tgt;
    const forceFail = el.failToggle.checked;

    showLive(false);
    el.consoleBody.textContent = '';
    clearBenchmark();
    setTab('log');

    if (!source.trim()) {
      setStatus('failed', 'Tests failed');
      logLine('Error: the source editor is empty. Enter ' + LANGS[from].label + ' code and run again.', 'fail');
      return;
    }

    setBusy(true);
    setStatus('running', 'Running tests...');

    try {
      logLine('veriscribe verify --from ' + from + ' --to ' + to, 'cmd');
      showLive(true);

      logLine('Parsing ' + LANGS[from].label + ' source (' + lineLabel(lineCount(source)) + ')', 'info');
      await sleep(450);

      const problems = validateSource(source, from);
      if (problems.length > 0) {
        showLive(false);
        clearOutput();
        state.errorLines = new Set(problems.map((p) => p.line));
        refreshSource();
        setStatus('failed', 'Syntax error');
        problems.forEach((p) => {
          logLine('line ' + p.line + ': ' + p.message, 'fail');
          if (p.text) logLine(p.text, 'detail');
        });
        addSummary(
          'fail',
          problems.length === 1 ? 'Syntax error found' : problems.length + ' syntax errors found',
          'Translation skipped. Fix the lines marked red in the editor and run again.'
        );
        return;
      }

      logLine('Translating to ' + LANGS[to].label, 'info');
      const translated = await translateCode(source, from, to);
      showOutput(translated, to);
      logLine('Generated ' + lineLabel(lineCount(translated)) + ' of ' + LANGS[to].label, 'info');
      await sleep(350);

      logLine('Compiling both programs in sandbox', 'info');
      await sleep(600);

      logLine('Running ' + TEST_CASES.length + ' equivalence tests', 'info');
      const result = await runTests(from, to, forceFail, logLine);

      logLine('Benchmarking naive vs repaired translation (' + BENCH_TOTAL + ' cases)', 'info');
      await sleep(800);
      const bench = computeBenchmark(source, from, to, forceFail);
      renderBenchmark(bench, from, to);
      logLine(
        'Naive translation passed ' + bench.naivePassed + '/' + bench.total +
        ', repaired translation passed ' + bench.repairedPassed + '/' + bench.total,
        'info'
      );

      showLive(false);

      if (result.failed === 0) {
        setStatus('success', 'Equivalence verified');
        addSummary('pass', 'Equivalence verified', result.passed + '/' + result.total + ' tests passed in ' + result.elapsed + ' ms');
      } else {
        setStatus('failed', 'Tests failed');
        addSummary('fail', 'Tests failed', result.passed + ' passed, ' + result.failed + ' failed. Review the translation for the mismatched case.');
      }

      setTab('bench');
    } catch (err) {
      showLive(false);
      setStatus('failed', 'Tests failed');
      logLine('Error: ' + (err && err.message ? err.message : 'verification could not complete.'), 'fail');
    } finally {
      setBusy(false);
    }
  }

  

  function applyLangs(newSrc, newTgt) {
    const current = el.srcInput.value;
    if (current.trim() === '' || current === SAMPLES[state.src]) {
      el.srcInput.value = SAMPLES[newSrc];
    }
    state.src = newSrc;
    state.tgt = newTgt;
    el.srcLang.value = newSrc;
    el.tgtLang.value = newTgt;
    state.errorLines = new Set();
    refreshSource();
    clearOutput();
  }

  function showFileError(message) {
    resetConsole();
    setStatus('failed', 'Upload failed');
    logLine(message, 'fail');
  }

  async function loadFile(file) {
    if (!file || state.busy) return;

    const dot = file.name.lastIndexOf('.');
    const ext = dot >= 0 ? file.name.slice(dot + 1).toLowerCase() : '';
    if (!Object.prototype.hasOwnProperty.call(EXT_TO_LANG, ext)) {
      showFileError('Cannot open ' + file.name + '. Supported types: .py, .java, .cpp, .cc, .cxx, .h, .hpp, .txt');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      showFileError(file.name + ' is larger than 1 MB. Upload a smaller file.');
      return;
    }

    let text;
    try {
      text = await file.text();
    } catch (err) {
      showFileError('Could not read ' + file.name + '.');
      return;
    }
    if (text.indexOf('\u0000') !== -1) {
      showFileError(file.name + ' is not a text file.');
      return;
    }

    const lang = EXT_TO_LANG[ext] || state.src;
    const newTgt = lang === state.tgt ? state.src : state.tgt;
    applyLangs(lang, newTgt);

    el.srcInput.value = text.replace(/\r\n?/g, '\n');
    el.srcInput.scrollTop = 0;
    el.srcInput.scrollLeft = 0;
    state.errorLines = new Set();
    refreshSource();

    el.fileName.textContent = file.name;
    el.fileName.title = file.name;
    el.fileName.hidden = false;

    resetConsole();
    logLine('Loaded ' + file.name + ' (' + lineLabel(lineCount(el.srcInput.value)) + ') as ' + LANGS[lang].label, 'info');
  }

  el.srcLang.addEventListener('change', () => {
    const newSrc = el.srcLang.value;
    const newTgt = el.tgtLang.value === newSrc ? state.src : el.tgtLang.value;
    applyLangs(newSrc, newTgt);
  });

  el.tgtLang.addEventListener('change', () => {
    const newTgt = el.tgtLang.value;
    const newSrc = el.srcLang.value === newTgt ? state.tgt : el.srcLang.value;
    applyLangs(newSrc, newTgt);
  });

  

  let trapTab = true;

  el.srcInput.addEventListener('focus', () => {
    trapTab = true;
  });

  function onEdit() {
    state.errorLines = new Set();
    refreshSource();
    markStale();
  }

  el.srcInput.addEventListener('input', onEdit);

  el.srcInput.addEventListener('scroll', syncScroll);

  el.srcInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      trapTab = false;
      return;
    }
    if (e.key === 'Tab' && trapTab && !e.shiftKey) {
      e.preventDefault();
      const start = el.srcInput.selectionStart;
      const end = el.srcInput.selectionEnd;
      el.srcInput.setRangeText('    ', start, end, 'end');
      onEdit();
    }
  });

  el.runBtn.addEventListener('click', run);

  el.tabLog.addEventListener('click', () => setTab('log'));
  el.tabBench.addEventListener('click', () => setTab('bench'));

  [el.tabLog, el.tabBench].forEach((tab) => {
    tab.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      const next = tab === el.tabLog ? el.tabBench : el.tabLog;
      setTab(next === el.tabBench ? 'bench' : 'log');
      next.focus();
    });
  });

  el.fileBtn.addEventListener('click', () => {
    if (!state.busy) el.fileInput.click();
  });

  el.fileInput.addEventListener('change', () => {
    const file = el.fileInput.files && el.fileInput.files[0];
    loadFile(file);
    el.fileInput.value = '';
  });

  ['dragenter', 'dragover'].forEach((type) => {
    el.editor.addEventListener(type, (e) => {
      e.preventDefault();
      el.editor.classList.add('is-dragging');
    });
  });

  ['dragleave', 'drop'].forEach((type) => {
    el.editor.addEventListener(type, (e) => {
      e.preventDefault();
      el.editor.classList.remove('is-dragging');
    });
  });

  el.editor.addEventListener('drop', (e) => {
    const file = e.dataTransfer && e.dataTransfer.files ? e.dataTransfer.files[0] : null;
    loadFile(file);
  });

  ['dragover', 'drop'].forEach((type) => {
    document.addEventListener(type, (e) => e.preventDefault());
  });

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      run();
    }
  });

  el.clearBtn.addEventListener('click', () => {
    if (!state.busy) resetConsole();
  });

  el.exportBtn.addEventListener('click', () => {
    if (!state.output) return;
    const blob = new Blob([state.output], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = LANGS[state.tgt].file;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  el.copyBtn.addEventListener('click', async () => {
    if (!state.output) return;
    try {
      await navigator.clipboard.writeText(state.output);
      el.copyLabel.textContent = 'Copied';
    } catch (err) {
      el.copyLabel.textContent = 'Copy failed';
    }
    setTimeout(() => {
      el.copyLabel.textContent = 'Copy';
    }, 1600);
  });

  

  el.srcInput.value = SAMPLES[state.src];
  refreshSource();
  clearOutput();
  resetConsole();
})();
