// --- Helpers ---
const qs = (s) => document.querySelector(s);
const qsa = (s) => Array.from(document.querySelectorAll(s));

let secret = generateSecret();
let history = [];

const inputs = qsa(".digit");
const submitBtn = qs("#submitBtn");
const resetBtn = qs("#resetBtn");
const hint = qs("#hint");
const tbody = qs("#historyBody");
const keypad = qsa(".key");

initTheme();
wireInputs();
renderHistory();

// Focus first box on load
inputs[0].focus();

/* Generate 4 unique digits from 1..9 */
function generateSecret() {
  const digits = ["1","2","3","4","5","6","7","8","9"];
  for (let i = digits.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [digits[i], digits[j]] = [digits[j], digits[i]];
  }
  const result = digits.slice(0,4);
  // console.log("Secret:", result.join("")); // uncomment for debugging
  return result;
}

function getGuessArray() {
  return inputs.map(i => (i.value || "").trim());
}

function hasDuplicates(arr) {
  const s = new Set(arr);
  return s.size !== arr.length;
}

function validGuess(arr) {
  if (arr.some(d => d === "")) return { ok: false, msg: "Enter all four digits." };
  if (arr.some(d => d === "0")) return { ok: false, msg: "Use digits 1–9 (no zero)." };
  if (hasDuplicates(arr)) return { ok: false, msg: "All digits must be unique." };
  return { ok: true, msg: "" };
}

/* Count digit matches and position matches */
function scoreGuess(guessArr, secretArr) {
  const correctDigits = guessArr.filter(d => secretArr.includes(d)).length;
  let correctPositions = 0;
  for (let i = 0; i < 4; i++) if (guessArr[i] === secretArr[i]) correctPositions++;
  return { correctDigits, correctPositions };
}

/* --- Input behavior: auto-advance, prevent duplicates, backspace auto-shift --- */
function wireInputs() {
  inputs.forEach((input, idx) => {
    input.addEventListener("beforeinput", (e) => {
      // Only allow digits 1..9; block other input (including 0)
      if (e.data && !/^[1-9]$/.test(e.data)) {
        e.preventDefault();
      }
    });

    input.addEventListener("input", (e) => {
      let v = input.value.replace(/[^1-9]/g, "");
      if (v.length > 1) v = v[0];
      // Prevent duplicates across boxes
      const others = getGuessArray().filter((_, i) => i !== idx);
      if (others.includes(v)) {
        input.value = "";
        flash(input);
        setHint("No repeating digits.");
        return;
      }
      input.value = v;

      // Move to next if filled
      if (v && idx < 3) inputs[idx + 1].focus();
      setHint("");
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Backspace") {
        if (input.value === "" && idx > 0) {
          inputs[idx - 1].focus();
          inputs[idx - 1].value = "";
        }
      } else if (e.key === "ArrowLeft" && idx > 0) {
        inputs[idx - 1].focus();
      } else if (e.key === "ArrowRight" && idx < 3) {
        inputs[idx + 1].focus();
      } else if (e.key === "Enter") {
        submit();
      }
    });

    // Double-click to stick focus (default behavior is fine; kept for spec)
    input.addEventListener("dblclick", () => input.select());
  });

  submitBtn.addEventListener("click", submit);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") submit();
  });

  // Keypad (desktop)
  keypad.forEach((btn) => {
    btn.addEventListener("click", () => {
      const d = btn.textContent.trim();
      // Fill the first empty box that doesn't have duplicate
      for (let i = 0; i < 4; i++) {
        if (!inputs[i].value) {
          // reject duplicates
          if (getGuessArray().includes(d)) {
            flash(inputs[i]);
            setHint("No repeating digits.");
            return;
          }
          inputs[i].value = d;
          if (i < 3) inputs[i + 1].focus();
          else inputs[i].focus();
          break;
        }
      }
    });
  });

  resetBtn.addEventListener("click", resetGame);
}

function submit() {
  const guess = getGuessArray();
  const v = validGuess(guess);
  if (!v.ok) {
    setHint(v.msg);
    shakeInputs();
    return;
  }

  const { correctDigits, correctPositions } = scoreGuess(guess, secret);
  const numberStr = guess.join("");
  history.unshift({ numberStr, correctDigits, correctPositions });
  renderHistory();

  if (correctPositions === 4) {
    setHint("🎉 You cracked it! Press Reset to play again.");
    inputs.forEach(i => i.classList.add("win"));
  } else {
    setHint(`${correctDigits} correct digit${s(correctDigits)}, ${correctPositions} in correct position${s(correctPositions)}.`);
  }

  // Clear inputs after each try
  inputs.forEach(i => (i.value = ""));
  inputs[0].focus();
}

function renderHistory() {
  tbody.innerHTML = history
    .map(
      (h) => `<tr>
        <td>${h.numberStr}</td>
        <td>${h.correctDigits}</td>
        <td>${h.correctPositions}</td>
      </tr>`
    )
    .join("");
}

function resetGame() {
  secret = generateSecret();
  history = [];
  renderHistory();
  inputs.forEach(i => { i.value = ""; i.classList.remove("win"); });
  inputs[0].focus();
  setHint("New round started.");
}

function setHint(msg) { hint.textContent = msg; }
function s(n){ return n === 1 ? "" : "s"; }
function shakeInputs(){ inputs.forEach(i => { i.classList.add("shake"); setTimeout(()=>i.classList.remove("shake"), 200); }); }
function flash(el){ el.classList.add("shake"); setTimeout(()=>el.classList.remove("shake"), 150); }

/* --- THEME TOGGLE --- */
function initTheme() {
  const key = "formula4-theme";
  const saved = localStorage.getItem(key) || "system";
  setTheme(saved);

  qs("#themeToggle").addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "light" ? "dark" : current === "dark" ? "system" : "light";
    setTheme(next);
    localStorage.setItem(key, next);
  });
}
function setTheme(mode) {
  document.documentElement.setAttribute("data-theme", mode);
  const icon = qs("#themeIcon");
  if (mode === "light") icon.textContent = "☀️";
  else if (mode === "dark") icon.textContent = "🌙";
  else icon.textContent = "🌓"; // system
}
