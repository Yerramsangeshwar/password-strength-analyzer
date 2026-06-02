// PassForge — Full Frontend Application
(function () {
  'use strict';

  const API = '/api';
  let token = localStorage.getItem('pf_token') || null;
  let currentUser = localStorage.getItem('pf_user') || null;
  let isGuest = false;
  let lastAnalysis = null;

  const $ = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);

  // ── API ──
  async function apiCall(endpoint, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(API + endpoint, { ...options, headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  // ── TOAST ──
  function toast(msg, type = 'info') {
    const el = $('#toast');
    el.textContent = msg;
    el.className = `toast ${type} show`;
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 3200);
  }

  // ── AUTH ──
  function initAuth() {
    $$('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        $$('.auth-tab').forEach(t => t.classList.remove('active'));
        $$('.auth-form').forEach(f => f.classList.remove('active'));
        tab.classList.add('active');
        $(`#${tab.dataset.tab}Form`).classList.add('active');
      });
    });

    $('#loginBtn').addEventListener('click', async () => {
      const email = $('#loginEmail').value.trim();
      const password = $('#loginPassword').value;
      const errEl = $('#loginError');
      errEl.textContent = '';
      if (!email || !password) { errEl.textContent = 'Please fill all fields'; return; }
      $('#loginBtn').textContent = 'Signing in...';
      try {
        const data = await apiCall('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
        token = data.token; currentUser = data.username;
        localStorage.setItem('pf_token', token);
        localStorage.setItem('pf_user', currentUser);
        launchApp();
      } catch (err) { errEl.textContent = err.message; }
      finally { $('#loginBtn').textContent = 'Sign In'; }
    });

    $('#loginPassword').addEventListener('keydown', e => { if (e.key === 'Enter') $('#loginBtn').click(); });

    $('#registerBtn').addEventListener('click', async () => {
      const username = $('#regUsername').value.trim();
      const email = $('#regEmail').value.trim();
      const password = $('#regPassword').value;
      const errEl = $('#registerError');
      errEl.textContent = '';
      if (!username || !email || !password) { errEl.textContent = 'Please fill all fields'; return; }
      $('#registerBtn').textContent = 'Creating...';
      try {
        const data = await apiCall('/auth/register', { method: 'POST', body: JSON.stringify({ username, email, password }) });
        token = data.token; currentUser = data.username;
        localStorage.setItem('pf_token', token);
        localStorage.setItem('pf_user', currentUser);
        launchApp();
      } catch (err) { errEl.textContent = err.message; }
      finally { $('#registerBtn').textContent = 'Create Account'; }
    });

    $('#guestBtn').addEventListener('click', () => { isGuest = true; currentUser = 'Guest'; launchApp(); });
  }

  function launchApp() {
    $('#authOverlay').style.display = 'none';
    $('#mainApp').style.display = 'block';
    const navU = $('#navUsername');
    navU.innerHTML = isGuest ? '<span class="guest-badge">Guest</span>' : `<strong>${currentUser}</strong>`;
    initApp();
  }

  $('#logoutBtn').addEventListener('click', () => {
    token = null; currentUser = null; isGuest = false;
    localStorage.removeItem('pf_token');
    localStorage.removeItem('pf_user');
    location.reload();
  });

  // ── NAVIGATION ──
  function initNav() {
    $$('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.nav-btn').forEach(b => b.classList.remove('active'));
        $$('.view').forEach(v => v.classList.remove('active'));
        btn.classList.add('active');
        $(`#view-${btn.dataset.view}`).classList.add('active');
        if (btn.dataset.view === 'history') loadHistory();
        if (btn.dataset.view === 'stats') loadStats();
      });
    });

    // Tool tabs
    $$('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.tab-btn').forEach(b => b.classList.remove('active'));
        $$('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        $(`#tab-${btn.dataset.tab}`).classList.add('active');
      });
    });
  }

  // ── PASSWORD ANALYSIS ENGINE ──
  function analyzePassword(pw) {
    const len = pw.length;
    const upper   = (pw.match(/[A-Z]/g) || []).length;
    const lower   = (pw.match(/[a-z]/g) || []).length;
    const numbers = (pw.match(/[0-9]/g) || []).length;
    const special = (pw.match(/[^A-Za-z0-9]/g) || []).length;

    let charsetSize = 0;
    if (upper > 0)   charsetSize += 26;
    if (lower > 0)   charsetSize += 26;
    if (numbers > 0) charsetSize += 10;
    if (special > 0) charsetSize += 32;
    if (charsetSize === 0) charsetSize = 1;

    const entropy = len > 0 ? Math.round(len * Math.log2(charsetSize)) : 0;

    let score = 0;
    if (len >= 6)  score += 10;
    if (len >= 8)  score += 10;
    if (len >= 12) score += 8;
    if (len >= 16) score += 7;
    if (upper > 0)   score += 10;
    if (lower > 0)   score += 10;
    if (numbers > 0) score += 10;
    if (special > 0) score += 10;
    if (entropy >= 28) score += 5;
    if (entropy >= 40) score += 5;
    if (entropy >= 60) score += 8;
    if (entropy >= 80) score += 7;

    const patterns = [/password/i,/123456/,/qwerty/i,/abc/i,/letmein/i,/admin/i,/welcome/i,/^(.)\1+$/];
    let hasPattern = false;
    patterns.forEach(p => { if (p.test(pw)) { score = Math.max(0, score - 20); hasPattern = true; } });

    score = Math.min(100, Math.max(0, score));

    let strength, strengthClass;
    if (score < 20)      { strength = 'Weak';     strengthClass = 'weak'; }
    else if (score < 40) { strength = 'Fair';     strengthClass = 'fair'; }
    else if (score < 60) { strength = 'Good';     strengthClass = 'good'; }
    else if (score < 80) { strength = 'Strong';   strengthClass = 'strong'; }
    else                 { strength = 'Fortress'; strengthClass = 'fortress'; }

    const guessesPerSec = 1e10;
    const combinations = Math.pow(charsetSize, len);
    const seconds = combinations / guessesPerSec / 2;
    const crackTime = formatCrackTime(seconds);

    const suggestions = [];
    if (len < 8)     suggestions.push('Make it at least 8 characters long');
    if (len < 12)    suggestions.push('Use 12+ characters for better security');
    if (upper === 0)   suggestions.push('Add uppercase letters (A–Z)');
    if (lower === 0)   suggestions.push('Add lowercase letters (a–z)');
    if (numbers === 0) suggestions.push('Include at least one number (0–9)');
    if (special === 0) suggestions.push('Add special characters (!@#$%^&*)');
    if (len >= 8 && len < 16 && score >= 40) suggestions.push('Extend to 16+ characters for excellent security');
    if (hasPattern) suggestions.push('Avoid common patterns and dictionary words');
    if (suggestions.length === 0) suggestions.push('Excellent password! Make sure to store it safely.');

    const warnings = [];
    if (/password/i.test(pw)) warnings.push('Contains the word "password"');
    if (/123/.test(pw))       warnings.push('Contains sequential numbers (123...)');
    if (/abc/i.test(pw))      warnings.push('Contains sequential letters (abc...)');
    if (/^(.)\1+$/.test(pw))  warnings.push('All characters are the same');
    if (/qwerty|asdf|zxcv/i.test(pw)) warnings.push('Contains keyboard pattern (qwerty...)');
    if (/19\d{2}|20\d{2}/.test(pw))   warnings.push('Contains a year — easily guessed');

    return { len, upper, lower, numbers, special, entropy, score, strength, strengthClass, crackTime, suggestions, warnings };
  }

  function formatCrackTime(s) {
    if (s < 1)          return 'Instantly';
    if (s < 60)         return `${Math.round(s)} seconds`;
    if (s < 3600)       return `${Math.round(s/60)} minutes`;
    if (s < 86400)      return `${Math.round(s/3600)} hours`;
    if (s < 2592000)    return `${Math.round(s/86400)} days`;
    if (s < 31536000)   return `${Math.round(s/2592000)} months`;
    if (s < 3.15e9)     return `${Math.round(s/31536000)} years`;
    if (s < 3.15e12)    return `${Math.round(s/3.15e9)} thousand years`;
    if (s < 3.15e15)    return `${Math.round(s/3.15e12)} million years`;
    return 'Billions of years';
  }

  // ── UPDATE UI ──
  const colors = { weak:'#dc2626', fair:'#ea580c', good:'#d97706', strong:'#059669', fortress:'#2563eb' };

  function updateUI(pw) {
    if (!pw) { resetUI(); return; }
    const a = analyzePassword(pw);
    lastAnalysis = a;

    const sv = $('#strengthValue'), sf = $('#strengthFill');
    sv.textContent = a.strength;
    sv.className = `strength-value ${a.strengthClass}`;
    sf.style.width = `${a.score}%`;
    sf.className = `strength-fill ${a.strengthClass}`;

    $('#pwInput').className = `pw-input strength-${a.strengthClass}`;

    const ring = $('#scoreRingFill');
    ring.style.strokeDashoffset = 283 - (a.score / 100) * 283;
    ring.style.stroke = colors[a.strengthClass];
    $('#scoreNum').textContent = a.score;
    $('#scoreNum').style.color = colors[a.strengthClass];

    $('#crackTime').textContent = a.crackTime;
    $('#entropyVal').textContent = a.entropy;
    $('#lengthVal').textContent = a.len;

    setCriterion('length', a.len >= 8, `${a.len} character${a.len !== 1 ? 's' : ''}`);
    setCriterion('upper',  a.upper > 0, `${a.upper} found`);
    setCriterion('lower',  a.lower > 0, `${a.lower} found`);
    setCriterion('number', a.numbers > 0, `${a.numbers} found`);
    setCriterion('special',a.special > 0, `${a.special} found`);
    setCriterion('long',   a.len >= 16, 'Excellent length');

    const total = a.len || 1;
    setBar('upper', a.upper, total);
    setBar('lower', a.lower, total);
    setBar('number', a.numbers, total);
    setBar('special', a.special, total);

    $('#suggestionsList').innerHTML = a.suggestions.map(s => `<div class="suggestion-item">${s}</div>`).join('');

    const pc = $('#patternCard');
    if (a.warnings.length > 0) {
      pc.style.display = 'block';
      $('#patternWarnings').innerHTML = a.warnings.map(w => `<div class="pattern-warn-item">${w}</div>`).join('');
    } else {
      pc.style.display = 'none';
    }

    if (!isGuest) $('#saveRow').style.display = 'flex';
  }

  function setCriterion(name, pass, detail) {
    const el = $(`#crit-${name}`), check = $(`#crit-${name}-check`), det = $(`#crit-${name}-detail`);
    el.className = `criterion ${pass ? 'pass' : 'fail'}`;
    check.textContent = pass ? '✓' : '';
    if (det) det.textContent = detail;
  }

  function setBar(type, count, total) {
    $(`#bar-${type}`).style.width = `${Math.min(100, Math.round((count/total)*100))}%`;
    $(`#count-${type}`).textContent = count;
  }

  function resetUI() {
    lastAnalysis = null;
    $('#strengthValue').textContent = '—';
    $('#strengthValue').className = 'strength-value';
    $('#strengthFill').style.width = '0%';
    $('#strengthFill').className = 'strength-fill';
    $('#pwInput').className = 'pw-input';
    $('#scoreRingFill').style.strokeDashoffset = 283;
    $('#scoreRingFill').style.stroke = 'transparent';
    $('#scoreNum').textContent = '0';
    $('#scoreNum').style.color = '';
    $('#crackTime').textContent = '—';
    $('#entropyVal').textContent = '0';
    $('#lengthVal').textContent = '0';
    ['length','upper','lower','number','special','long'].forEach(c => setCriterion(c, false, '0'));
    ['upper','lower','number','special'].forEach(t => { $(`#bar-${t}`).style.width = '0%'; $(`#count-${t}`).textContent = '0'; });
    $('#suggestionsList').innerHTML = '<div class="suggestion-item">Type a password above to get personalized suggestions</div>';
    $('#patternCard').style.display = 'none';
    $('#saveRow').style.display = 'none';
  }

  // ── GENERATOR ──
  const genState = { upper:true, lower:true, numbers:true, symbols:true, ambiguous:false };

  function generatePassword(len) {
    let cs = '';
    if (genState.upper)   cs += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (genState.lower)   cs += 'abcdefghijklmnopqrstuvwxyz';
    if (genState.numbers) cs += '0123456789';
    if (genState.symbols) cs += '!@#$%^&*()_+-=[]{}|;:,.<>?';
    if (genState.ambiguous) cs = cs.replace(/[O0Il1]/g, '');
    if (!cs) cs = 'abcdefghijklmnopqrstuvwxyz';
    const arr = new Uint32Array(len);
    crypto.getRandomValues(arr);
    let pw = Array.from(arr, v => cs[v % cs.length]).join('');
    // guarantee one of each
    const inject = [];
    if (genState.upper)   inject.push('ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.random()*26|0]);
    if (genState.lower)   inject.push('abcdefghijklmnopqrstuvwxyz'[Math.random()*26|0]);
    if (genState.numbers) inject.push('0123456789'[Math.random()*10|0]);
    if (genState.symbols) inject.push('!@#$%^&*'[Math.random()*8|0]);
    const pa = pw.split('');
    inject.forEach(c => { pa[Math.random()*len|0] = c; });
    return pa.join('');
  }

  function initGenerator() {
    $('#genLength').addEventListener('input', () => { $('#genLengthVal').textContent = $('#genLength').value; });
    $$('.toggle-chip').forEach(chip => {
      if (!chip.dataset.type) return;
      chip.addEventListener('click', () => {
        genState[chip.dataset.type] = !genState[chip.dataset.type];
        chip.classList.toggle('on', genState[chip.dataset.type]);
      });
    });
    $('#genBtn').addEventListener('click', () => { $('#genOutput').textContent = generatePassword(+$('#genLength').value); });
    $('#genCopyBtn').addEventListener('click', () => {
      const t = $('#genOutput').textContent;
      if (t === 'Click Generate →') return;
      navigator.clipboard.writeText(t).then(() => toast('Copied!', 'success'));
    });
    $('#genUseBtn').addEventListener('click', () => {
      const t = $('#genOutput').textContent;
      if (t === 'Click Generate →') return;
      $('#pwInput').value = t;
      $('#pwInput').type = 'text';
      $('#pwToggle').textContent = '🙈';
      updateUI(t);
      $$('.nav-btn').forEach(b => b.classList.remove('active'));
      $$('.view').forEach(v => v.classList.remove('active'));
      $('[data-view="analyzer"]').classList.add('active');
      $('#view-analyzer').classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ── PASSPHRASE GENERATOR ──
  const WORDS = [
    'apple','brave','cabin','dance','eagle','flame','grape','happy','igloo','joker',
    'karma','lemon','magic','noble','ocean','piano','queen','river','storm','tiger',
    'ultra','vivid','waltz','xenon','yacht','zebra','amber','blaze','coral','delta',
    'ember','frost','giant','honey','ivory','jewel','knack','lunar','maple','north',
    'olive','pearl','quartz','robin','solar','topaz','unity','vapor','wheat','xerox',
    'yield','zonal','acorn','bloom','crisp','dusty','earth','fairy','ghost','hazel',
    'inky','jazzy','kelp','lotus','misty','nimble','orbit','petal','quirk','rocky',
    'sandy','turbo','urban','velvet','windy','xylo','young','zesty','agile','bold',
    'calm','daring','echo','fierce','glare','haste','iron','jumpy','keen','loud',
    'mellow','neat','open','proud','quiet','rapid','sharp','thick','umber','vast'
  ];

  function generatePassphrase() {
    const count = +$('#ppWords').value;
    const sep   = $('#ppSep').value || '-';
    const cap   = $('#ppCapitalize').dataset.on === 'true';
    const nums  = $('#ppNumbers').dataset.on === 'true';
    const arr   = new Uint32Array(count);
    crypto.getRandomValues(arr);
    let words = Array.from(arr, v => WORDS[v % WORDS.length]);
    if (cap) words = words.map(w => w[0].toUpperCase() + w.slice(1));
    let phrase = words.join(sep);
    if (nums) {
      const n = Math.floor(Math.random() * 900) + 100;
      phrase += sep + n;
    }
    return phrase;
  }

  function initPassphrase() {
    $('#ppWords').addEventListener('input', () => { $('#ppWordsVal').textContent = $('#ppWords').value; });

    ['ppCapitalize','ppNumbers'].forEach(id => {
      $(` #${id}`);
      document.getElementById(id).addEventListener('click', () => {
        const el = document.getElementById(id);
        const on = el.dataset.on === 'true';
        el.dataset.on = !on;
        el.classList.toggle('on', !on);
      });
    });

    function refreshPP() {
      const pp = generatePassphrase();
      $('#ppOutput').textContent = pp;
      const a = analyzePassword(pp);
      $('#ppAnalysis').style.display = 'block';
      $('#ppStrengthVal').textContent = a.strength;
      $('#ppStrengthVal').className = `strength-value ${a.strengthClass}`;
      $('#ppStrengthFill').style.width = `${a.score}%`;
      $('#ppStrengthFill').className = `strength-fill ${a.strengthClass}`;
      $('#ppEntropy').textContent = a.entropy;
      $('#ppCrack').textContent = a.crackTime;
    }

    $('#ppGenBtn').addEventListener('click', refreshPP);
    $('#ppCopyBtn').addEventListener('click', () => {
      const t = $('#ppOutput').textContent;
      if (t === 'Click Generate →') return;
      navigator.clipboard.writeText(t).then(() => toast('Passphrase copied!', 'success'));
    });
    $('#ppUseBtn').addEventListener('click', () => {
      const t = $('#ppOutput').textContent;
      if (t === 'Click Generate →') return;
      $('#pwInput').value = t;
      $('#pwInput').type = 'text';
      updateUI(t);
      $$('.nav-btn').forEach(b => b.classList.remove('active'));
      $$('.view').forEach(v => v.classList.remove('active'));
      $('[data-view="analyzer"]').classList.add('active');
      $('#view-analyzer').classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ── PASSWORD COMPARE ──
  function initCompare() {
    function runCompare() {
      const a = $('#cmpA').value, b = $('#cmpB').value;
      if (!a || !b) { $('#compareResult').style.display='none'; $('#compareEmpty').style.display='block'; return; }
      const ra = analyzePassword(a), rb = analyzePassword(b);
      $('#compareResult').style.display = 'block';
      $('#compareEmpty').style.display = 'none';

      $('#cmpScoreA').textContent = ra.score;
      $('#cmpScoreB').textContent = rb.score;
      $('#cmpStrA').textContent = ra.strength;
      $('#cmpStrB').textContent = rb.strength;

      const winner = $('#cmpWinner');
      if (ra.score > rb.score) { winner.className='compare-winner a-wins'; winner.textContent=`🏆 Password A is stronger by ${ra.score - rb.score} points`; }
      else if (rb.score > ra.score) { winner.className='compare-winner b-wins'; winner.textContent=`🏆 Password B is stronger by ${rb.score - ra.score} points`; }
      else { winner.className='compare-winner tie'; winner.textContent='🤝 Both passwords are equally strong'; }

      const rows = [
        ['Length', ra.len, rb.len],
        ['Entropy', `${ra.entropy}b`, `${rb.entropy}b`],
        ['Crack time', ra.crackTime, rb.crackTime],
        ['Has uppercase', ra.upper > 0 ? '✓' : '✗', rb.upper > 0 ? '✓' : '✗'],
        ['Has numbers',   ra.numbers > 0 ? '✓' : '✗', rb.numbers > 0 ? '✓' : '✗'],
        ['Has special',   ra.special > 0 ? '✓' : '✗', rb.special > 0 ? '✓' : '✗'],
      ];

      $('#cmpDetails').innerHTML = `
        <div style="grid-column:span 2;">
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead><tr>
              <th style="text-align:left;padding:8px 10px;color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid var(--border)">Metric</th>
              <th style="text-align:center;padding:8px 10px;color:var(--blue);font-size:11px;text-transform:uppercase;border-bottom:1px solid var(--border)">Password A</th>
              <th style="text-align:center;padding:8px 10px;color:var(--purple);font-size:11px;text-transform:uppercase;border-bottom:1px solid var(--border)">Password B</th>
            </tr></thead>
            <tbody>${rows.map(([label,va,vb]) => `
              <tr style="border-bottom:1px solid var(--border);">
                <td style="padding:9px 10px;color:var(--text2);font-weight:500">${label}</td>
                <td style="padding:9px 10px;text-align:center;font-family:var(--mono);font-weight:600;color:var(--blue)">${va}</td>
                <td style="padding:9px 10px;text-align:center;font-family:var(--mono);font-weight:600;color:var(--purple)">${vb}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>`;
    }

    ['cmpA','cmpB'].forEach(id => { document.getElementById(id).addEventListener('input', runCompare); });

    $$('.compare-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const inp = document.getElementById(btn.dataset.target);
        inp.type = inp.type === 'password' ? 'text' : 'password';
        btn.textContent = inp.type === 'password' ? '👁' : '🙈';
      });
    });
  }

  // ── BREACH CHECKER (HaveIBeenPwned k-Anonymity) ──
  async function sha1(str) {
    const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('').toUpperCase();
  }

  function initBreach() {
    $('#breachBtn').addEventListener('click', async () => {
      const pw = $('#breachInput').value;
      if (!pw) { toast('Enter a password to check', 'error'); return; }
      const btn = $('#breachBtn');
      const result = $('#breachResult');
      btn.disabled = true;
      btn.textContent = '🔍 Checking...';
      result.innerHTML = '<div class="breach-result checking">🔍 Checking against breach database...</div>';
      try {
        const hash  = await sha1(pw);
        const prefix = hash.slice(0, 5);
        const suffix = hash.slice(5);
        const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
        const text = await res.text();
        const lines = text.split('\n');
        const found = lines.find(l => l.split(':')[0] === suffix);
        if (found) {
          const count = parseInt(found.split(':')[1]);
          result.innerHTML = `<div class="breach-result pwned">💀 This password has appeared <strong>${count.toLocaleString()} time${count>1?'s':''}</strong> in data breaches. Do not use it!</div>`;
        } else {
          result.innerHTML = '<div class="breach-result safe">✅ Great news! This password was not found in any known data breach.</div>';
        }
      } catch (err) {
        result.innerHTML = '<div class="breach-result" style="background:var(--yellow-d);border-color:rgba(217,119,6,0.2);color:var(--yellow)">⚠️ Could not reach breach database. Check your internet connection.</div>';
      } finally {
        btn.disabled = false;
        btn.textContent = '🔍 Check Now';
      }
    });
  }

  // ── TOGGLE ──
  function initToggle() {
    $('#pwToggle').addEventListener('click', () => {
      const inp = $('#pwInput');
      inp.type = inp.type === 'password' ? 'text' : 'password';
      $('#pwToggle').textContent = inp.type === 'password' ? '👁' : '🙈';
    });
  }

  // ── SAVE ──
  function initSave() {
    $('#saveBtn').addEventListener('click', async () => {
      if (!lastAnalysis || isGuest) return;
      const label = $('#saveLabel').value.trim() || 'Unnamed';
      try {
        await apiCall('/passwords/save', { method:'POST', body: JSON.stringify({
          label, score: lastAnalysis.score, strength: lastAnalysis.strengthClass,
          length: lastAnalysis.len, has_upper: lastAnalysis.upper>0, has_lower: lastAnalysis.lower>0,
          has_number: lastAnalysis.numbers>0, has_special: lastAnalysis.special>0,
          entropy: lastAnalysis.entropy, crack_time: lastAnalysis.crackTime, suggestions: lastAnalysis.suggestions
        })});
        toast('Analysis saved!', 'success');
        $('#saveLabel').value = '';
      } catch (err) { toast(err.message, 'error'); }
    });

    $('#clearBtn').addEventListener('click', () => { $('#pwInput').value = ''; resetUI(); });
  }

  // ── HISTORY ──
  let historyData = [];

  async function loadHistory() {
    if (isGuest) {
      $('#historyGrid').innerHTML = '<div class="empty-history"><span class="ei">🔒</span><p>Sign in to view history</p></div>';
      return;
    }
    try {
      const data = await apiCall('/passwords/history?limit=50');
      historyData = data.rows;
      renderHistory(historyData);
    } catch { toast('Failed to load history', 'error'); }
  }

  function renderHistory(rows) {
    const grid = $('#historyGrid');
    if (!rows.length) {
      grid.innerHTML = '<div class="empty-history"><span class="ei">📂</span><p>No saved analyses yet. Analyze and save a password!</p></div>';
      return;
    }
    grid.innerHTML = rows.map(r => {
      const dots = [
        { pass: r.has_upper,   color: 'var(--blue)' },
        { pass: r.has_lower,   color: 'var(--green2)' },
        { pass: r.has_number,  color: 'var(--yellow)' },
        { pass: r.has_special, color: 'var(--purple)' },
      ];
      const date = new Date(r.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
      return `<div class="history-card ${r.strength}">
        <div class="hc-top">
          <div class="hc-label">${esc(r.label)}</div>
          <div class="hc-strength ${r.strength}">${r.strength}</div>
        </div>
        <div class="hc-meta">
          <div class="hc-meta-item">Score: <strong>${r.score}</strong></div>
          <div class="hc-meta-item">Length: <strong>${r.length}</strong></div>
          <div class="hc-meta-item">Entropy: <strong>${r.entropy}b</strong></div>
        </div>
        <div class="hc-criteria">${dots.map(d=>`<div class="hc-crit-dot" style="background:${d.pass?d.color:'var(--bg4)'}"></div>`).join('')}</div>
        <div class="hc-meta-item" style="font-size:11px;margin-bottom:10px;">⚡ ${esc(r.crack_time)}</div>
        <div class="hc-bottom">
          <div class="hc-date">${date}</div>
          <button class="hc-delete" data-id="${r.id}">🗑</button>
        </div>
      </div>`;
    }).join('');

    $$('.hc-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await apiCall(`/passwords/history/${btn.dataset.id}`, { method:'DELETE' });
          historyData = historyData.filter(r => r.id !== btn.dataset.id);
          renderHistory(historyData);
          toast('Deleted', 'info');
        } catch { toast('Delete failed', 'error'); }
      });
    });
  }

  // ── EXPORT CSV ──
  function exportCSV() {
    if (!historyData.length) { toast('No history to export', 'error'); return; }
    const header = ['Label','Strength','Score','Length','Entropy','Crack Time','Has Uppercase','Has Lowercase','Has Numbers','Has Special','Date'];
    const rows = historyData.map(r => [
      `"${r.label}"`, r.strength, r.score, r.length, r.entropy,
      `"${r.crack_time}"`, r.has_upper?'Yes':'No', r.has_lower?'Yes':'No',
      r.has_number?'Yes':'No', r.has_special?'Yes':'No',
      new Date(r.created_at).toLocaleDateString()
    ]);
    const csv = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type:'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `passforge-history-${Date.now()}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast('CSV exported!', 'success');
  }

  // ── EXPORT PDF ──
  function exportPDF() {
    if (!historyData.length) { toast('No history to export', 'error'); return; }
    const strengthColors = { weak:'#dc2626', fair:'#ea580c', good:'#d97706', strong:'#059669', fortress:'#2563eb' };
    const rows = historyData.map(r => `
      <tr>
        <td>${esc(r.label)}</td>
        <td style="color:${strengthColors[r.strength]||'#333'};font-weight:700;text-transform:capitalize">${r.strength}</td>
        <td style="text-align:center;font-weight:700">${r.score}</td>
        <td style="text-align:center">${r.length}</td>
        <td style="text-align:center">${r.entropy}b</td>
        <td>${esc(r.crack_time)}</td>
        <td style="text-align:center">${r.has_upper?'✓':'✗'}</td>
        <td style="text-align:center">${r.has_number?'✓':'✗'}</td>
        <td style="text-align:center">${r.has_special?'✓':'✗'}</td>
        <td style="color:#888;font-size:11px">${new Date(r.created_at).toLocaleDateString()}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>PassForge History</title>
      <style>
        body{font-family:'Segoe UI',sans-serif;padding:32px;color:#0d1426;background:#fff}
        h1{font-size:24px;font-weight:800;margin-bottom:4px}
        p{color:#7888aa;font-size:13px;margin-bottom:24px}
        table{width:100%;border-collapse:collapse;font-size:13px}
        th{background:#f1f4fd;padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#7888aa;border-bottom:2px solid #e2e8f8}
        td{padding:10px 12px;border-bottom:1px solid #e2e8f8}
        tr:hover td{background:#f8faff}
      </style></head><body>
      <h1>🔐 PassForge — Password History</h1>
      <p>Exported on ${new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})} · ${historyData.length} record${historyData.length!==1?'s':''}</p>
      <table>
        <thead><tr>
          <th>Label</th><th>Strength</th><th>Score</th><th>Length</th><th>Entropy</th>
          <th>Crack Time</th><th>Upper</th><th>Numbers</th><th>Special</th><th>Date</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table></body></html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.print(); }, 400);
    toast('PDF ready — use browser print dialog', 'success');
  }

  // ── STATS ──
  async function loadStats() {
    if (isGuest) { $('#statTotal').textContent='—'; $('#statAvg').textContent='—'; $('#statBest').textContent='—'; return; }
    try {
      const data = await apiCall('/passwords/stats');
      $('#statTotal').textContent = data.total;
      $('#statAvg').textContent   = data.avgScore;
      $('#statBest').textContent  = data.best ? data.best.strength : '—';

      const colorMap = { weak:'var(--red2)', fair:'var(--orange)', good:'var(--yellow)', strong:'var(--green2)', fortress:'var(--blue)' };
      const max = Math.max(...(data.byStrength.map(s => s.count)), 1);

      if (data.byStrength.length) {
        $('#strengthBreakdown').innerHTML = data.byStrength.map(s => `
          <div class="breakdown-bar-row">
            <div class="breakdown-name" style="color:${colorMap[s.strength]||'var(--muted)'}">${s.strength}</div>
            <div class="breakdown-track"><div class="breakdown-fill" style="width:${Math.round((s.count/max)*100)}%;background:${colorMap[s.strength]||'var(--blue)'}"></div></div>
            <div class="breakdown-count">${s.count}</div>
          </div>`).join('');
      }
    } catch {}
  }

  // ── UTILS ──
  function esc(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── INIT APP ──
  function initApp() {
    let debounce;
    $('#pwInput').addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => updateUI($('#pwInput').value), 80);
    });

    initToggle();
    initGenerator();
    initPassphrase();
    initCompare();
    initBreach();
    initSave();
    initNav();

    $('#exportCsvBtn').addEventListener('click', exportCSV);
    $('#exportPdfBtn').addEventListener('click', exportPDF);
  }

  // ── BOOT ──
  if (token) { currentUser = localStorage.getItem('pf_user') || 'User'; launchApp(); }
  else { initAuth(); }

})();
