// ===== UTILITIES =====
const qs = (s, el = document) => el.querySelector(s);
const qsa = (s, el = document) => [...el.querySelectorAll(s)];

const digitsInputs = qsa('.digit');
const historyBody = qs('#historyBody');
const hint = qs('#hint');
const submitBtn = qs('#submitBtn');
const resetBtn = qs('#resetBtn');
const themeBtn = qs('#themeBtn');
const iconSun = qs('#iconSun');
const iconMoon = qs('#iconMoon');
const keypad = qs('#keypad');

let secret = [];
let theme = localStorage.getItem('f4-theme') || 'system';

// ===== THEME =====
function applyTheme(value) {
  document.documentElement.setAttribute('data-theme', value);
  iconSun.classList.toggle('hidden', value === 'dark');
  iconMoon.classList.toggle('hidden', value !== 'dark');
}
function initTheme() {
  if (theme === 'system') {
    // adopt current system scheme
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light');
  } else {
    applyTheme(theme);
  }
}
themeBtn.addEventListener('click', () => {
  // toggle light/dark (system was only for initial load)
  theme = (document.documentElement.getAttribute('data-theme') === 'dark') ? 'light' : 'dark';
  localStorage.setItem('f4-theme', theme);
  applyTheme(theme);
});
initTheme();

// ===== SECRET NUMBER =====
function makeSecret() {
  const pool = ['1','2','3','4','5','6','7','8','9'];
  secret = [];
  while (secret.length < 4) {
    const n = pool.splice(Math.floor(Math.random()*pool.length), 1)[0];
    secret.push(n);
  }
  // console.log('SECRET:', secret.join('')); // uncomment for debugging
}
makeSecret();

// ===== INPUT FLOW (auto-advance, backspace, no duplicates) =====
function nextEmptyIndex() {
  for (let i = 0; i < 4; i++) if (!digitsInputs[i].value) return i;
  return 4;
}
function setHint(msg, isError=false) {
  hint.textContent = msg || '';
  hint.style.color = isError ? '#e11d48' : 'var(--muted)';
}

function shake(el) {
  el.classList.remove('shake');
  void el.offsetWidth; // restart animation
  el.classList.add('shake');
}

function isDuplicate(value, index) {
  const vals = digitsInputs.map((inp, i) => i === index ? value : inp.value);
  const set = new Set(vals.filter(Boolean));
  return set.size !== vals.filter(Boolean).length;
}

digitsInputs.forEach((inp, index) => {
  // Keep selection at end
  inp.addEventListener('focus', e => { e.target.select(); });

  // Typing
  inp.addEventListener('input', e => {
    let v = e.target.value.replace(/\D/g, ''); // numbers only
    if (v === '0') v = ''; // 1-9 only
    if (v.length > 1) v = v.slice(-1);

    // reject duplicates
    if (v && isDuplicate(v, index)) {
      e.target.value = '';
      setHint('No repeated digits (1–9).', true);
      shake(e.target);
      return;
    }

    e.target.value = v;
    setHint('');

    if (v && index < 3) {
      digitsInputs[index + 1].focus();
    }
  });

  // Backspace auto-move left if empty
  inp.addEventListener('keydown', e => {
    if (e.key === 'Backspace' && !e.target.value && index > 0) {
      digitsInputs[index - 1].focus();
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit();
    }
    // Left/Right arrow convenience
    if (e.key === 'ArrowLeft' && index > 0) digitsInputs[index - 1].focus();
    if (e.key === 'ArrowRight' && index < 3) digitsInputs[index + 1].focus();
  });
});

// ===== KEYPAD (desktop) =====
if (keypad) {
  keypad.addEventListener('click', (e) => {
    const btn = e.target.closest('.key');
    if (!btn) return;
    const digit = btn.textContent;
    const idx = nextEmptyIndex();
    if (idx >= 4) {
      setHint('All four filled. Press Enter.', false);
      return;
    }
    if (isDuplicate(digit, idx)) {
      setHint('No repeated digits (1–9).', true);
      shake(digitsInputs[idx]);
      return;
    }
    digitsInputs[idx].value = digit;
    if (idx < 3) digitsInputs[idx + 1].focus();
    else digitsInputs[idx].focus();
  });
}
 
// ===== SUBMIT / SCORE =====
function scoreGuess(guessArr) {
  // digits correct = intersection count (order independent)
  const digitsCorrect = guessArr.filter(d => secret.includes(d)).length;
  // positions correct = same index match
  const positionsCorrect = guessArr.reduce((acc, d, i) => acc + (secret[i] === d ? 1 : 0), 0);
  return { digitsCorrect, positionsCorrect };
}

function onSubmit() {
  const guessArr = digitsInputs.map(i => i.value);
  if (guessArr.some(v => !v)) {
    setHint('Enter all 4 digits (1–9, no repeats).', true);
    shake(qs('.inputs'));
    return;
  }
  const { digitsCorrect, positionsCorrect } = scoreGuess(guessArr);

  // Append to history (new row goes BELOW previous ones)
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${guessArr.join('')}</td>
    <td>${digitsCorrect}</td>
    <td>${positionsCorrect}</td>
  `;
  historyBody.appendChild(tr);

  // Auto-scroll the history container (only that pane, not page)
  const wrap = qs('.table-wrap');
  wrap.scrollTop = wrap.scrollHeight;

  if (positionsCorrect === 4) {
    setHint('🎉 You cracked it! Press Reset to play again.');
    submitBtn.disabled = true;
    digitsInputs.forEach(inp => inp.disabled = true);
  } else {
    setHint(`${digitsCorrect} digit(s) correct • ${positionsCorrect} in correct position.`);
  }

  // Prepare for next guess
  digitsInputs.forEach(inp => inp.value = '');
  digitsInputs[0].focus();
}

submitBtn.addEventListener('click', onSubmit);

// ===== RESET =====
function resetGame() {
  makeSecret();
  historyBody.innerHTML = '';
  setHint('New game started. Good luck!');
  submitBtn.disabled = false;
  digitsInputs.forEach(inp => { inp.disabled = false; inp.value = ''; });
  digitsInputs[0].focus();
}
resetBtn.addEventListener('click', resetGame);

// Focus first box on load
window.addEventListener('load', () => digitsInputs[0].focus());
