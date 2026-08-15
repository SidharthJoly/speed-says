(() => {
  const HIGHSCORE_KEY = 'speedSays_highScore';

  const el = {
    screenStart: document.getElementById('screen-start'),
    screenGame: document.getElementById('screen-game'),
    screenOver: document.getElementById('screen-over'),
    btnStart: document.getElementById('btn-start'),
    btnRestart: document.getElementById('btn-restart'),
    highscoreValue: document.getElementById('highscore-value'),
    hudRound: document.getElementById('hud-round'),
    hudScore: document.getElementById('hud-score'),
    hudLives: document.getElementById('hud-lives'),
    timerBar: document.getElementById('timer-bar'),
    challengeLabel: document.getElementById('challenge-label'),
    challengeArea: document.getElementById('challenge-area'),
    feedback: document.getElementById('feedback'),
    overReason: document.getElementById('over-reason'),
    finalScore: document.getElementById('final-score'),
    newHigh: document.getElementById('new-high'),
  };

  const TYPE_PHRASES = [
    'SYBAU', 'LOCK IN', 'SIUUUU', 'MOGGED', "IT'S THE WATER", 'GYATT',
    'NO CAP', 'RAAAHH', 'GOATED', 'SHEEESH', 'GOOFY AHH', 'BROSKI', 'RIZZLER',
  ];

  const BAIT_SETS = [
    { target: 'SPEED', decoys: ['SPEDD', 'SPEDE', 'SPEEED', 'SPEE D'] },
    { target: 'CHAT', decoys: ['CHTA', 'CAHT', 'CHATT', 'C HAT'] },
    { target: 'RIZZ', decoys: ['RIZ', 'RIZZZ', 'RZIZ', 'R1ZZ'] },
    { target: 'GOAT', decoys: ['G0AT', 'GAOT', 'GOTA', 'GOAAT'] },
    { target: 'SIUU', decoys: ['SIIU', 'SUIU', 'SIUU!', 'S1UU'] },
    { target: 'MOGGED', decoys: ['MOGED', 'MOGGD', 'MOGGEDD', 'MOGGE D'] },
  ];

  const ROUND_TYPES = ['type', 'rageclick', 'reaction', 'bait'];

  let state;

  function resetState() {
    state = {
      round: 0,
      score: 0,
      lives: 3,
      streak: 0,
      lastType: null,
      resolved: false,
      cleanup: null,
      rafId: null,
    };
  }

  function getRoundTime(round) {
    return Math.max(1.5, 5 - (round - 1) * 0.5);
  }

  function pickRoundType() {
    const options = ROUND_TYPES.filter((t) => t !== state.lastType);
    const type = options[Math.floor(Math.random() * options.length)];
    state.lastType = type;
    return type;
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function showScreen(name) {
    for (const s of [el.screenStart, el.screenGame, el.screenOver]) {
      s.classList.remove('active');
    }
    name.classList.add('active');
  }

  function updateHud() {
    el.hudRound.textContent = state.round;
    el.hudScore.textContent = state.score;
    el.hudLives.textContent = '❤️'.repeat(Math.max(state.lives, 0)) + '🖤'.repeat(Math.max(3 - state.lives, 0));
  }

  function startGame() {
    resetState();
    updateHud();
    el.feedback.textContent = '';
    el.feedback.className = 'feedback';
    showScreen(el.screenGame);
    nextRound();
  }

  function nextRound() {
    state.round += 1;
    state.resolved = false;
    updateHud();
    const type = pickRoundType();
    const duration = getRoundTime(state.round);
    renderChallenge(type);
    startTimer(duration);
  }

  function startTimer(duration) {
    const startTime = performance.now();
    el.timerBar.style.background = 'var(--green)';
    el.timerBar.style.width = '100%';

    function tick(now) {
      if (state.resolved) return;
      const elapsed = (now - startTime) / 1000;
      const fraction = Math.max(0, 1 - elapsed / duration);
      el.timerBar.style.width = `${fraction * 100}%`;
      if (fraction < 0.3) {
        el.timerBar.style.background = 'var(--red)';
      } else if (fraction < 0.6) {
        el.timerBar.style.background = 'var(--yellow)';
      }
      if (fraction <= 0) {
        resolveRound(false, 'timeout');
        return;
      }
      state.rafId = requestAnimationFrame(tick);
    }
    state.rafId = requestAnimationFrame(tick);
  }

  function resolveRound(success, reason) {
    if (state.resolved) return;
    state.resolved = true;
    if (state.rafId) cancelAnimationFrame(state.rafId);
    if (state.cleanup) {
      state.cleanup();
      state.cleanup = null;
    }

    if (success) {
      const remainingFraction = parseFloat(el.timerBar.style.width) / 100 || 0;
      const basePoints = 100;
      const timeBonus = Math.round(remainingFraction * 100);
      state.streak += 1;
      const multiplier = 1 + Math.min(state.streak, 10) * 0.1;
      const points = Math.round((basePoints + timeBonus) * multiplier);
      state.score += points;
      el.feedback.textContent = `+${points} · streak ${state.streak}`;
      el.feedback.className = 'feedback good';
      el.challengeArea.classList.remove('flash-bad');
      void el.challengeArea.offsetWidth;
      el.challengeArea.classList.add('flash-good');
    } else {
      state.streak = 0;
      state.lives -= 1;
      const messages = {
        timeout: "TOO SLOW",
        wrong: "GOT BAITED",
        early: "JUMPED THE GUN",
      };
      el.feedback.textContent = messages[reason] || 'FAIL';
      el.feedback.className = 'feedback bad';
      el.challengeArea.classList.remove('flash-good');
      void el.challengeArea.offsetWidth;
      el.challengeArea.classList.add('flash-bad');
    }

    updateHud();

    if (state.lives <= 0) {
      setTimeout(() => gameOver(success === false ? (reasonText(reason)) : ''), 650);
      return;
    }

    setTimeout(nextRound, 700);
  }

  function reasonText(reason) {
    const map = {
      timeout: 'Ran out of time.',
      wrong: 'Clicked the wrong one.',
      early: 'Clicked before the signal.',
    };
    return map[reason] || '';
  }

  function gameOver(reason) {
    const highScore = parseInt(localStorage.getItem(HIGHSCORE_KEY) || '0', 10);
    const isNewHigh = state.score > highScore;
    if (isNewHigh) {
      localStorage.setItem(HIGHSCORE_KEY, String(state.score));
    }
    el.finalScore.textContent = state.score;
    el.overReason.textContent = reason || '';
    el.newHigh.classList.toggle('hidden', !isNewHigh);
    showScreen(el.screenOver);
  }

  function renderChallenge(type) {
    el.challengeArea.innerHTML = '';
    el.feedback.textContent = '';
    el.feedback.className = 'feedback';

    if (type === 'type') renderTypeFast();
    else if (type === 'rageclick') renderRageClick();
    else if (type === 'reaction') renderReaction();
    else if (type === 'bait') renderBait();
  }

  function renderTypeFast() {
    el.challengeLabel.textContent = 'TYPE IT FAST';
    const phrase = pick(TYPE_PHRASES);

    const phraseEl = document.createElement('div');
    phraseEl.className = 'type-phrase';
    phraseEl.textContent = phrase;

    const input = document.createElement('input');
    input.className = 'type-input';
    input.type = 'text';
    input.autocomplete = 'off';
    input.spellcheck = false;

    function onInput() {
      const val = input.value.trim().toUpperCase();
      if (val === phrase) {
        resolveRound(true);
      }
    }
    input.addEventListener('input', onInput);

    el.challengeArea.appendChild(phraseEl);
    el.challengeArea.appendChild(input);
    setTimeout(() => input.focus(), 30);

    state.cleanup = () => input.removeEventListener('input', onInput);
  }

  function renderRageClick() {
    el.challengeLabel.textContent = 'RAGE CLICK';
    const target = Math.min(8 + state.round * 2, 30);
    let count = 0;

    const countEl = document.createElement('div');
    countEl.className = 'rage-count';
    countEl.innerHTML = `<span>0</span> / ${target}`;

    const btn = document.createElement('button');
    btn.className = 'rage-btn';
    btn.textContent = 'MASH';

    function onClick() {
      count += 1;
      countEl.innerHTML = `<span>${count}</span> / ${target}`;
      const jitter = () => `translate(${Math.random() * 16 - 8}px, ${Math.random() * 16 - 8}px)`;
      btn.style.transform = jitter();
      if (count >= target) {
        resolveRound(true);
      }
    }
    btn.addEventListener('click', onClick);

    el.challengeArea.appendChild(countEl);
    el.challengeArea.appendChild(btn);

    state.cleanup = () => btn.removeEventListener('click', onClick);
  }

  function renderReaction() {
    el.challengeLabel.textContent = 'REACTION';
    const duration = getRoundTime(state.round);

    const box = document.createElement('div');
    box.className = 'reaction-box wait';
    box.textContent = 'WAIT...';

    let phase = 'wait';
    let goTime = 0;
    let delayTimeout = null;

    const minDelay = 500;
    const maxDelay = Math.max(minDelay + 200, duration * 1000 - 900);
    const delay = minDelay + Math.random() * (maxDelay - minDelay);

    delayTimeout = setTimeout(() => {
      phase = 'go';
      goTime = performance.now();
      box.className = 'reaction-box go';
      box.textContent = 'CLICK!';
    }, delay);

    function onClick() {
      if (phase === 'wait') {
        resolveRound(false, 'early');
        return;
      }
      const reactionMs = Math.round(performance.now() - goTime);
      el.feedback.textContent = `${reactionMs}ms`;
      resolveRound(true);
    }
    box.addEventListener('click', onClick);

    el.challengeArea.appendChild(box);

    state.cleanup = () => {
      clearTimeout(delayTimeout);
      box.removeEventListener('click', onClick);
    };
  }

  function renderBait() {
    el.challengeLabel.textContent = 'BAIT & SWITCH';
    const set = pick(BAIT_SETS);
    const decoys = shuffle(set.decoys).slice(0, 3);
    const options = shuffle([set.target, ...decoys]);

    const instruction = document.createElement('div');
    instruction.className = 'bait-instruction';
    instruction.innerHTML = `Click <b>${set.target}</b> — not the lookalikes`;

    const grid = document.createElement('div');
    grid.className = 'bait-grid';

    const listeners = [];
    options.forEach((label) => {
      const btn = document.createElement('button');
      btn.className = 'bait-btn';
      btn.textContent = label;
      const onClick = () => {
        if (label === set.target) resolveRound(true);
        else resolveRound(false, 'wrong');
      };
      btn.addEventListener('click', onClick);
      listeners.push([btn, onClick]);
      grid.appendChild(btn);
    });

    el.challengeArea.appendChild(instruction);
    el.challengeArea.appendChild(grid);

    state.cleanup = () => {
      for (const [btn, fn] of listeners) btn.removeEventListener('click', fn);
    };
  }

  function initHighScoreDisplay() {
    const highScore = parseInt(localStorage.getItem(HIGHSCORE_KEY) || '0', 10);
    el.highscoreValue.textContent = highScore;
  }

  el.btnStart.addEventListener('click', startGame);
  el.btnRestart.addEventListener('click', () => {
    initHighScoreDisplay();
    startGame();
  });

  initHighScoreDisplay();
})();
