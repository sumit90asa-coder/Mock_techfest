/**
 * THE CIPHER ARCHIVE - Interactive Cryptography Engine
 * Techfest ZeroCode 2026 // Production Standard
 * Pure Vanilla Logic - Zero Framework Dependencies
 */

(function () {
  'use strict';

  // -------------------------------------------------------------
  // Standard English Monogram Frequencies (Etaoin Shrdlu distribution)
  // Used for chi-squared heuristic cryptanalysis
  // -------------------------------------------------------------
  const ENGLISH_FREQ = {
    A: 8.12, B: 1.49, C: 2.71, D: 4.32, E: 12.02, F: 2.30, G: 2.03,
    H: 5.92, I: 7.31, J: 0.10, K: 0.69, L: 3.98, M: 2.61, N: 6.95,
    O: 7.68, P: 1.82, Q: 0.11, R: 6.02, S: 6.28, T: 9.10, U: 2.88,
    V: 1.11, W: 2.36, X: 0.17, Y: 2.11, Z: 0.07
  };

  // -------------------------------------------------------------
  // Application State Model
  // -------------------------------------------------------------
  const state = {
    mode: 'encrypt', // 'encrypt' | 'decrypt'
    cipher: 'caesar', // 'caesar' | 'vigenere' | 'xor' | 'base64'
    caesarShift: 3,
    vigenereKey: 'CIPHER',
    xorKey: 'ZERO26',
    inputText: 'Classified transmission: ZeroCode Techfest 2026 interactive cipher protocol ready.',
    outputText: '',
    hashInput: 'Techfest ZeroCode 2026'
  };

  // -------------------------------------------------------------
  // DOM Cache
  // -------------------------------------------------------------
  const dom = {
    body: document.body,
    scrollProgress: document.getElementById('scroll-progress'),
    cursorDot: document.getElementById('cursor-dot'),
    cursorRing: document.getElementById('cursor-ring'),
    clock: document.getElementById('live-clock'),
    statusText: document.getElementById('system-status-text'),
    heroSubline: document.getElementById('hero-subline'),
    logList: document.getElementById('event-log-list'),

    // Mode Buttons
    btnModeEncrypt: document.getElementById('btn-mode-encrypt'),
    btnModeDecrypt: document.getElementById('btn-mode-decrypt'),

    // Cipher Select Tabs
    cipherTabs: document.querySelectorAll('.cipher-tab'),

    // Dynamic Key Controls
    caesarControls: document.getElementById('caesar-controls'),
    caesarShiftSlider: document.getElementById('caesar-shift-slider'),
    caesarShiftVal: document.getElementById('caesar-shift-val'),

    vigenereControls: document.getElementById('vigenere-controls'),
    vigenereKeyInput: document.getElementById('vigenere-key-input'),
    vigenereKeyError: document.getElementById('vigenere-key-error'),

    xorControls: document.getElementById('xor-controls'),
    xorKeyInput: document.getElementById('xor-key-input'),

    base64Controls: document.getElementById('base64-controls'),

    // IO Fields
    cipherInput: document.getElementById('cipher-input'),
    cipherOutput: document.getElementById('cipher-output'),
    inputPaneLabel: document.getElementById('input-pane-label'),
    outputPaneLabel: document.getElementById('output-pane-label'),
    inputCharCount: document.getElementById('input-char-count'),
    outputCharCount: document.getElementById('output-char-count'),
    btnCopyOutput: document.getElementById('btn-copy-output'),
    copyBtnText: document.getElementById('copy-btn-text'),
    btnClearInput: document.getElementById('btn-clear-input'),
    btnLoadSample: document.getElementById('btn-load-sample'),
    btnSwapIO: document.getElementById('btn-swap-io'),

    // Canvas Frequency Analysis
    freqCanvas: document.getElementById('freq-canvas'),
    entropyDelta: document.getElementById('entropy-delta'),

    // Key Entropy Meter
    strengthStatusBadge: document.getElementById('strength-status-badge'),
    gaugeBarFill: document.getElementById('gauge-bar-fill'),
    entropyBitsVal: document.getElementById('entropy-bits-val'),
    entropyPoolVal: document.getElementById('entropy-pool-val'),
    entropyLenVal: document.getElementById('entropy-len-val'),
    crackTimeVal: document.getElementById('crack-time-val'),

    // Hash Vault
    hashInputText: document.getElementById('hash-input-text'),
    hashOutputDisplay: document.getElementById('hash-output-display'),
    btnCopyHash: document.getElementById('btn-copy-hash'),

    // Caesar Brute Force Visualizer
    btnCrackCaesar: document.getElementById('btn-crack-caesar'),
    crackerProgressText: document.getElementById('cracker-progress-text'),
    crackerBestScore: document.getElementById('cracker-best-score'),
    crackerWaterfall: document.getElementById('cracker-waterfall')
  };

  // -------------------------------------------------------------
  // Cryptographic Mathematical Pipeline
  // -------------------------------------------------------------
  const CipherEngine = {
    // 1. Caesar Shift with true modular arithmetic
    caesar(text, shift, mode = 'encrypt') {
      let effShift = mode === 'encrypt' ? shift % 26 : (26 - (shift % 26)) % 26;
      return text.replace(/[a-zA-Z]/g, (ch) => {
        const isUpper = ch >= 'A' && ch <= 'Z';
        const base = isUpper ? 65 : 97;
        const code = ch.charCodeAt(0) - base;
        return String.fromCharCode(((code + effShift) % 26) + base);
      });
    },

    // 2. Vigenère Cipher: Polyalphabetic substitution preserving non-letters
    vigenere(text, key, mode = 'encrypt') {
      const cleanKey = key.toUpperCase().replace(/[^A-Z]/g, '');
      if (!cleanKey) return text;

      let keyIdx = 0;
      return text.replace(/[a-zA-Z]/g, (ch) => {
        const isUpper = ch >= 'A' && ch <= 'Z';
        const base = isUpper ? 65 : 97;
        const pCode = ch.charCodeAt(0) - base;
        const kCode = cleanKey.charCodeAt(keyIdx % cleanKey.length) - 65;
        keyIdx++;

        let resCode;
        if (mode === 'encrypt') {
          resCode = (pCode + kCode) % 26;
        } else {
          resCode = (pCode - kCode + 26) % 26;
        }
        return String.fromCharCode(resCode + base);
      });
    },

    // 3. XOR Cipher: Reversible bitwise mask represented cleanly in Hex
    xor(text, key, mode = 'encrypt') {
      if (!key) return text;
      
      try {
        if (mode === 'encrypt') {
          let hexOut = '';
          for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i);
            const keyCode = key.charCodeAt(i % key.length);
            const xorVal = charCode ^ keyCode;
            hexOut += xorVal.toString(16).padStart(2, '0');
          }
          return hexOut;
        } else {
          const cleanHex = text.replace(/[^0-9a-fA-F]/g, '');
          if (cleanHex.length % 2 !== 0) return 'ERROR: XOR decrypt requires valid even-length hex stream.';
          let decOut = '';
          for (let i = 0; i < cleanHex.length; i += 2) {
            const byteVal = parseInt(cleanHex.substr(i, 2), 16);
            const keyChar = key.charCodeAt((i / 2) % key.length);
            decOut += String.fromCharCode(byteVal ^ keyChar);
          }
          return decOut;
        }
      } catch (err) {
        return `XOR_STREAM_ERROR: ${err.message}`;
      }
    },

    // 4. Base64: Unicode-compliant standard RFC 4648
    base64(text, mode = 'encrypt') {
      try {
        if (mode === 'encrypt') {
          return btoa(unescape(encodeURIComponent(text)));
        } else {
          return decodeURIComponent(escape(atob(text.trim())));
        }
      } catch (err) {
        return 'BASE64_DECODE_ERR: Malformed payload stream.';
      }
    }
  };

  // -------------------------------------------------------------
  // Cryptanalysis & Heuristic Scoring (Chi-Squared Test)
  // -------------------------------------------------------------
  function calculateEnglishChiSquared(text) {
    const letters = text.toUpperCase().replace(/[^A-Z]/g, '');
    const len = letters.length;
    if (len === 0) return 99999;

    const counts = {};
    for (let i = 0; i < len; i++) {
      const ch = letters[i];
      counts[ch] = (counts[ch] || 0) + 1;
    }

    let chiSq = 0;
    for (let c = 65; c <= 90; c++) {
      const char = String.fromCharCode(c);
      const observed = counts[char] || 0;
      const expected = (ENGLISH_FREQ[char] / 100) * len;
      chiSq += Math.pow(observed - expected, 2) / (expected || 0.0001);
    }
    return chiSq;
  }

  // -------------------------------------------------------------
  // Native SubtleCrypto SHA-256 Digest
  // -------------------------------------------------------------
  async function computeSha256(str) {
    if (!window.crypto || !window.crypto.subtle) {
      return 'WebCrypto API unsupported in this environment.';
    }
    try {
      const msgBuffer = new TextEncoder().encode(str);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (err) {
      return `HASH_EXCEPTION: ${err.message}`;
    }
  }

  // -------------------------------------------------------------
  // Key Entropy & Strength Evaluator
  // -------------------------------------------------------------
  function evaluateKeyStrength(keyStr) {
    if (!keyStr) {
      return { bits: 0, pool: 0, len: 0, label: 'NONE', crackTime: '0s', class: 'badge-weak' };
    }

    let hasLower = /[a-z]/.test(keyStr);
    let hasUpper = /[A-Z]/.test(keyStr);
    let hasDigit = /[0-9]/.test(keyStr);
    let hasSpecial = /[^a-zA-Z0-9]/.test(keyStr);

    let pool = 0;
    if (hasLower) pool += 26;
    if (hasUpper) pool += 26;
    if (hasDigit) pool += 10;
    if (hasSpecial) pool += 33;
    if (pool === 0) pool = 1;

    const len = keyStr.length;
    const bits = Math.round(len * (Math.log(pool) / Math.log(2)));

    const combinations = Math.pow(pool, len);
    const seconds = combinations / 1e10;

    let crackTimeStr = '< 1 MILLISECOND';
    if (seconds > 31536000 * 1000) {
      crackTimeStr = '> 1,000 YEARS';
    } else if (seconds > 31536000) {
      crackTimeStr = `~${Math.round(seconds / 31536000)} YEARS`;
    } else if (seconds > 86400) {
      crackTimeStr = `~${Math.round(seconds / 86400)} DAYS`;
    } else if (seconds > 3600) {
      crackTimeStr = `~${Math.round(seconds / 3600)} HOURS`;
    } else if (seconds > 60) {
      crackTimeStr = `~${Math.round(seconds / 60)} MINUTES`;
    } else if (seconds >= 1) {
      crackTimeStr = `~${Math.round(seconds)} SECONDS`;
    }

    let label = 'WEAK';
    let badgeClass = 'badge-weak';
    if (bits > 100) {
      label = 'CLASSIFIED';
      badgeClass = 'badge-classified';
    } else if (bits >= 65) {
      label = 'STRONG';
      badgeClass = 'badge-strong';
    } else if (bits >= 35) {
      label = 'MODERATE';
      badgeClass = 'badge-moderate';
    }

    return {
      bits,
      pool,
      len,
      label,
      crackTime: crackTimeStr,
      class: badgeClass
    };
  }

  // -------------------------------------------------------------
  // Live Canvas 2D Frequency Spectrum Renderer
  // -------------------------------------------------------------
  function renderFrequencyChart(inputText, outputText) {
    const canvas = dom.freqCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    const inCounts = new Array(26).fill(0);
    const outCounts = new Array(26).fill(0);
    let inTotal = 0;
    let outTotal = 0;

    for (let ch of inputText.toUpperCase()) {
      const code = ch.charCodeAt(0) - 65;
      if (code >= 0 && code < 26) {
        inCounts[code]++;
        inTotal++;
      }
    }

    for (let ch of outputText.toUpperCase()) {
      const code = ch.charCodeAt(0) - 65;
      if (code >= 0 && code < 26) {
        outCounts[code]++;
        outTotal++;
      }
    }

    const padding = 12;
    const chartW = w - padding * 2;
    const chartH = h - 28;
    const barSlot = chartW / 26;
    const singleBarW = Math.max(1.5, (barSlot - 3) / 2);

    let maxPct = 0.25;
    for (let i = 0; i < 26; i++) {
      const inPct = inTotal ? inCounts[i] / inTotal : 0;
      const outPct = outTotal ? outCounts[i] / outTotal : 0;
      if (inPct > maxPct) maxPct = inPct;
      if (outPct > maxPct) maxPct = outPct;
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, chartH);
    ctx.lineTo(w - padding, chartH);
    ctx.stroke();

    const activeColor = state.mode === 'encrypt' ? '#D6FF4C' : '#FF4D4D';

    for (let i = 0; i < 26; i++) {
      const char = String.fromCharCode(65 + i);
      const x = padding + i * barSlot;

      const inPct = inTotal ? inCounts[i] / inTotal : 0;
      const inBarH = (inPct / maxPct) * (chartH - 15);

      const outPct = outTotal ? outCounts[i] / outTotal : 0;
      const outBarH = (outPct / maxPct) * (chartH - 15);

      ctx.fillStyle = '#6E6B65';
      ctx.fillRect(x, chartH - inBarH, singleBarW, inBarH);

      ctx.fillStyle = activeColor;
      ctx.fillRect(x + singleBarW + 1, chartH - outBarH, singleBarW, outBarH);

      ctx.fillStyle = '#8E8B85';
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(char, x + barSlot / 2, chartH + 12);
    }

    let sumDiffSq = 0;
    for (let i = 0; i < 26; i++) {
      const inP = inTotal ? inCounts[i] / inTotal : 0;
      const outP = outTotal ? outCounts[i] / outTotal : 0;
      sumDiffSq += Math.pow(inP - outP, 2);
    }
    const distDelta = Math.sqrt(sumDiffSq).toFixed(3);
    dom.entropyDelta.textContent = `Δ DIST: ${distDelta}`;
  }

  // -------------------------------------------------------------
  // Pipeline Execution Coordinator
  // -------------------------------------------------------------
  function executePipeline() {
    const rawInput = dom.cipherInput.value;
    state.inputText = rawInput;
    let result = '';

    switch (state.cipher) {
      case 'caesar':
        result = CipherEngine.caesar(rawInput, state.caesarShift, state.mode);
        break;

      case 'vigenere':
        if (/[0-9]/.test(dom.vigenereKeyInput.value)) {
          dom.vigenereKeyError.classList.remove('hidden');
          result = 'INVALID KEY: Passphrase cannot contain numeric digits.';
        } else {
          dom.vigenereKeyError.classList.add('hidden');
          result = CipherEngine.vigenere(rawInput, state.vigenereKey, state.mode);
        }
        break;

      case 'xor':
        result = CipherEngine.xor(rawInput, state.xorKey, state.mode);
        break;

      case 'base64':
        result = CipherEngine.base64(rawInput, state.mode);
        break;
    }

    state.outputText = result;
    dom.cipherOutput.value = result;

    const inBytes = new TextEncoder().encode(rawInput).length;
    const outBytes = new TextEncoder().encode(result).length;
    dom.inputCharCount.textContent = `${inBytes} B`;
    dom.outputCharCount.textContent = `${outBytes} B`;

    renderFrequencyChart(rawInput, result);

    let currentKey = '';
    if (state.cipher === 'caesar') currentKey = `SHIFT_${state.caesarShift}`;
    else if (state.cipher === 'vigenere') currentKey = state.vigenereKey;
    else if (state.cipher === 'xor') currentKey = state.xorKey;
    else currentKey = 'BASE64_STANDARD_ALPHABET';

    const entropy = evaluateKeyStrength(currentKey);
    dom.strengthStatusBadge.textContent = entropy.label;
    dom.strengthStatusBadge.className = `status-badge ${entropy.class}`;
    dom.entropyBitsVal.textContent = `${entropy.bits} BITS`;
    dom.entropyPoolVal.textContent = entropy.pool;
    dom.entropyLenVal.textContent = `${entropy.len} CHARS`;
    dom.crackTimeVal.textContent = entropy.crackTime;
    
    const fillPercent = Math.min(100, Math.max(5, (entropy.bits / 128) * 100));
    dom.gaugeBarFill.style.width = `${fillPercent}%`;
    dom.gaugeBarFill.style.backgroundColor = entropy.bits >= 65 ? 'var(--accent-acid)' : (entropy.bits >= 35 ? '#FFBD2E' : 'var(--accent-warn)');

    saveState();
  }

  // -------------------------------------------------------------
  // Brute Force Visualizer (Cracking Caesar)
  // -------------------------------------------------------------
  let crackerRunning = false;
  function crackCaesar() {
    if (crackerRunning) return;
    const targetText = state.mode === 'decrypt' ? dom.cipherInput.value : dom.cipherOutput.value;
    
    if (!targetText.trim()) {
      dom.crackerProgressText.textContent = 'ERR: Buffer empty.';
      return;
    }

    crackerRunning = true;
    dom.btnCrackCaesar.disabled = true;
    dom.crackerWaterfall.innerHTML = '';
    dom.crackerProgressText.textContent = 'RUNNING 25 HEURISTIC TRIALS...';
    logEvent('[CRACK] Commencing brute-force permutation search.');

    const trials = [];
    for (let shift = 1; shift <= 25; shift++) {
      const decoded = CipherEngine.caesar(targetText, shift, 'decrypt');
      const score = calculateEnglishChiSquared(decoded);
      trials.push({ shift, decoded, score });
    }

    const sorted = [...trials].sort((a, b) => a.score - b.score);
    const bestMatch = sorted[0];

    let currentIdx = 0;
    const intervalTime = 65;

    const timer = setInterval(() => {
      if (currentIdx < trials.length) {
        const item = trials[currentIdx];
        const row = document.createElement('div');
        row.className = 'crack-row candidate-active';
        row.id = `rot-row-${item.shift}`;
        row.innerHTML = `
          <span class="crack-rot">ROT ${String(item.shift).padStart(2, '0')}</span>
          <span class="crack-preview">${escapeHtml(item.decoded.substring(0, 40))}</span>
          <span class="crack-score">χ² ${item.score.toFixed(1)}</span>
        `;
        dom.crackerWaterfall.prepend(row);
        dom.crackerProgressText.textContent = `TESTING: ROT ${item.shift} / 25`;
        currentIdx++;
      } else {
        clearInterval(timer);
        crackerRunning = false;
        dom.btnCrackCaesar.disabled = false;
        dom.crackerProgressText.textContent = `SOLVED: ROT ${String(bestMatch.shift).padStart(2, '0')} RECOVERED`;
        dom.crackerBestScore.textContent = `BEST: ROT ${String(bestMatch.shift).padStart(2, '0')}`;
        
        const winningRow = document.getElementById(`rot-row-${bestMatch.shift}`);
        if (winningRow) {
          winningRow.className = 'crack-row candidate-winner';
        }

        logEvent(`[CRACK_RESOLVED] Best match ROT ${bestMatch.shift} (χ²: ${bestMatch.score.toFixed(1)}).`);
      }
    }, intervalTime);
  }

  // -------------------------------------------------------------
  // Hash Vault Controller
  // -------------------------------------------------------------
  async function updateHashDigest() {
    const text = dom.hashInputText.value;
    state.hashInput = text;
    const digestHex = await computeSha256(text);
    dom.hashOutputDisplay.textContent = digestHex;
  }

  // -------------------------------------------------------------
  // Event Logging System
  // -------------------------------------------------------------
  function logEvent(msg) {
    if (!dom.logList) return;
    const li = document.createElement('li');
    li.textContent = msg;
    dom.logList.prepend(li);
    while (dom.logList.children.length > 5) {
      dom.logList.removeChild(dom.logList.lastChild);
    }
  }

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // -------------------------------------------------------------
  // LocalStorage Persistence
  // -------------------------------------------------------------
  function saveState() {
    try {
      const payload = {
        mode: state.mode,
        cipher: state.cipher,
        caesarShift: state.caesarShift,
        vigenereKey: state.vigenereKey,
        xorKey: state.xorKey,
        inputText: state.inputText
      };
      localStorage.setItem('CIPHER_ARCHIVE_STATE_2026', JSON.stringify(payload));
    } catch (e) {}
  }

  function restoreState() {
    try {
      const saved = localStorage.getItem('CIPHER_ARCHIVE_STATE_2026');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.mode) setMode(parsed.mode, false);
        if (parsed.cipher) setCipher(parsed.cipher, false);
        if (parsed.caesarShift) {
          state.caesarShift = parsed.caesarShift;
          dom.caesarShiftSlider.value = parsed.caesarShift;
          dom.caesarShiftVal.textContent = parsed.caesarShift;
        }
        if (parsed.vigenereKey) {
          state.vigenereKey = parsed.vigenereKey;
          dom.vigenereKeyInput.value = parsed.vigenereKey;
        }
        if (parsed.xorKey) {
          state.xorKey = parsed.xorKey;
          dom.xorKeyInput.value = parsed.xorKey;
        }
        if (parsed.inputText) {
          dom.cipherInput.value = parsed.inputText;
        }
      }
    } catch (e) {}
  }

  // -------------------------------------------------------------
  // Mode & Cipher Switchers
  // -------------------------------------------------------------
  function setMode(newMode, shouldExecute = true) {
    state.mode = newMode;
    if (newMode === 'encrypt') {
      dom.body.classList.remove('mode-decrypt');
      dom.body.classList.add('mode-encrypt');
      dom.btnModeEncrypt.classList.add('active');
      dom.btnModeDecrypt.classList.remove('active');
      dom.statusText.textContent = 'SECURE // ENCRYPT';
      dom.inputPaneLabel.textContent = 'INPUT_STREAM [PLAINTEXT]';
      dom.outputPaneLabel.textContent = 'OUTPUT_STREAM [CIPHERTEXT]';
      logEvent('[MODE] Transform set to [ENCRYPT]. Acid gate active.');
    } else {
      dom.body.classList.remove('mode-encrypt');
      dom.body.classList.add('mode-decrypt');
      dom.btnModeDecrypt.classList.add('active');
      dom.btnModeEncrypt.classList.remove('active');
      dom.statusText.textContent = 'WARNING // DECRYPT';
      dom.inputPaneLabel.textContent = 'INPUT_STREAM [CIPHERTEXT]';
      dom.outputPaneLabel.textContent = 'OUTPUT_STREAM [PLAINTEXT]';
      logEvent('[MODE] Transform set to [DECRYPT]. Reverse vector active.');
    }

    if (shouldExecute) executePipeline();
  }

  function setCipher(newCipher, shouldExecute = true) {
    state.cipher = newCipher;
    
    dom.cipherTabs.forEach(tab => {
      if (tab.dataset.cipher === newCipher) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    dom.caesarControls.classList.add('hidden');
    dom.vigenereControls.classList.add('hidden');
    dom.xorControls.classList.add('hidden');
    dom.base64Controls.classList.add('hidden');

    if (newCipher === 'caesar') dom.caesarControls.classList.remove('hidden');
    else if (newCipher === 'vigenere') dom.vigenereControls.classList.remove('hidden');
    else if (newCipher === 'xor') dom.xorControls.classList.remove('hidden');
    else if (newCipher === 'base64') dom.base64Controls.classList.remove('hidden');

    logEvent(`[CIPHER] Activated algorithm: ${newCipher.toUpperCase()}.`);
    if (shouldExecute) executePipeline();
  }

  // -------------------------------------------------------------
  // Interactive UI Bindings & Magnetics
  // -------------------------------------------------------------
  function bindEvents() {
    dom.btnModeEncrypt.addEventListener('click', () => setMode('encrypt'));
    dom.btnModeDecrypt.addEventListener('click', () => setMode('decrypt'));

    dom.cipherTabs.forEach(tab => {
      tab.addEventListener('click', () => setCipher(tab.dataset.cipher));
    });

    dom.cipherInput.addEventListener('input', executePipeline);

    dom.caesarShiftSlider.addEventListener('input', (e) => {
      state.caesarShift = parseInt(e.target.value, 10);
      dom.caesarShiftVal.textContent = state.caesarShift;
      executePipeline();
    });

    dom.vigenereKeyInput.addEventListener('input', (e) => {
      state.vigenereKey = e.target.value.trim() || 'A';
      executePipeline();
    });

    dom.xorKeyInput.addEventListener('input', (e) => {
      state.xorKey = e.target.value || 'K';
      executePipeline();
    });

    dom.hashInputText.addEventListener('input', updateHashDigest);

    dom.btnCopyOutput.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(dom.cipherOutput.value);
        const originalText = dom.copyBtnText.textContent;
        dom.copyBtnText.textContent = 'COPIED!';
        setTimeout(() => { dom.copyBtnText.textContent = originalText; }, 1800);
        logEvent('[CLIPBOARD] Output payload copied.');
      } catch (err) {
        logEvent('[CLIPBOARD_ERR] Copy failed.');
      }
    });

    dom.btnCopyHash.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(dom.hashOutputDisplay.textContent.trim());
        const original = dom.btnCopyHash.textContent;
        dom.btnCopyHash.textContent = 'HASH COPIED!';
        setTimeout(() => { dom.btnCopyHash.textContent = original; }, 1800);
      } catch (err) {}
    });

    dom.btnClearInput.addEventListener('click', () => {
      dom.cipherInput.value = '';
      executePipeline();
      dom.cipherInput.focus();
    });

    dom.btnLoadSample.addEventListener('click', () => {
      dom.cipherInput.value = 'OPERATIONAL NOTICE 2026: Quantum resistance protocols deployed across all nodes. The secret rendezvous is confirmed for 0400 hours.';
      executePipeline();
    });

    dom.btnSwapIO.addEventListener('click', () => {
      const prevOut = dom.cipherOutput.value;
      dom.cipherInput.value = prevOut;
      setMode(state.mode === 'encrypt' ? 'decrypt' : 'encrypt');
    });

    dom.btnCrackCaesar.addEventListener('click', crackCaesar);

    window.addEventListener('resize', () => {
      renderFrequencyChart(dom.cipherInput.value, dom.cipherOutput.value);
    });

    window.addEventListener('scroll', () => {
      const scrollH = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollH > 0 ? (window.scrollY / scrollH) * 100 : 0;
      dom.scrollProgress.style.width = `${progress}%`;
    }, { passive: true });

    // Desktop only mouse follower
    if (window.matchMedia('(pointer: fine)').matches) {
      let mouseX = window.innerWidth / 2;
      let mouseY = window.innerHeight / 2;
      let ringX = mouseX;
      let ringY = mouseY;

      window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        dom.cursorDot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
      }, { passive: true });

      function renderCursor() {
        ringX += (mouseX - ringX) * 0.18;
        ringY += (mouseY - ringY) * 0.18;
        dom.cursorRing.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
        requestAnimationFrame(renderCursor);
      }
      requestAnimationFrame(renderCursor);
    }
  }

  // -------------------------------------------------------------
  // Typewriter Kinetic Header
  // -------------------------------------------------------------
  function runHeroTypewriter() {
    const text = 'A hands-on lab for classical and modern ciphers. Built for Techfest 2026.';
    let i = 0;
    dom.heroSubline.textContent = '';
    function typeChar() {
      if (i < text.length) {
        dom.heroSubline.textContent += text.charAt(i);
        i++;
        setTimeout(typeChar, 20);
      }
    }
    typeChar();
  }

  // -------------------------------------------------------------
  // Live High-Precision UTC Clock
  // -------------------------------------------------------------
  function startUtcClock() {
    function tick() {
      const now = new Date();
      const h = String(now.getUTCHours()).padStart(2, '0');
      const m = String(now.getUTCMinutes()).padStart(2, '0');
      const s = String(now.getUTCSeconds()).padStart(2, '0');
      const ms = String(now.getUTCMilliseconds()).padStart(3, '0');
      dom.clock.textContent = `${h}:${m}:${s}.${ms}`;
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // -------------------------------------------------------------
  // Boot Initializer
  // -------------------------------------------------------------
  function init() {
    restoreState();
    bindEvents();
    startUtcClock();
    runHeroTypewriter();
    updateHashDigest();
    executePipeline();
    logEvent('[SYSTEM] Pipeline synchronized. All units ready.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();