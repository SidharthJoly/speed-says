if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

(() => {
  const HIGHSCORE_KEY = 'speedSays_highScore';
  const BEST_STREAK_KEY = 'speedSays_bestStreakEver';
  const HISTORY_KEY = 'speedSays_history';
  const SFX_KEY = 'speedSays_sfxOn';

  const el = {
    btnSfx: document.getElementById('btn-sfx'),
    screenStart: document.getElementById('screen-start'),
    screenGame: document.getElementById('screen-game'),
    screenOver: document.getElementById('screen-over'),
    btnStart: document.getElementById('btn-start'),
    btnRestart: document.getElementById('btn-restart'),
    highscoreValue: document.getElementById('highscore-value'),
    beststreakValue: document.getElementById('beststreak-value'),
    historyRow: document.getElementById('history-row'),
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
    overBestStreak: document.getElementById('over-best-streak'),
    overRoundsCleared: document.getElementById('over-rounds-cleared'),
  };

  const TYPE_PHRASES = [
    'SYBAU', 'LOCK IN', 'SIUUUU', 'MOGGED', "IT'S THE WATER", 'GYATT',
    'NO CAP', 'RAAAHH', 'GOATED', 'SHEEESH', 'GOOFY AHH', 'BROSKI', 'RIZZLER',
    'ZESTY', 'DEMON TIME', 'W RIZZ', 'L TAKE', 'MEWING', 'CHOPPED', 'AURA FARM',
  ];

  const BAIT_SETS = [
    { target: 'SPEED', decoys: ['SPEDD', 'SPEDE', 'SPEEED', 'SPEE D', 'SPEE D'] },
    { target: 'CHAT', decoys: ['CHTA', 'CAHT', 'CHATT', 'C HAT'] },
    { target: 'RIZZ', decoys: ['RIZ', 'RIZZZ', 'RZIZ', 'R1ZZ'] },
    { target: 'GOAT', decoys: ['G0AT', 'GAOT', 'GOTA', 'GOAAT'] },
    { target: 'SIUU', decoys: ['SIIU', 'SUIU', 'SIUU!', 'S1UU'] },
    { target: 'MOGGED', decoys: ['MOGED', 'MOGGD', 'MOGGEDD', 'MOGGE D'] },
    { target: 'AURA', decoys: ['AURRA', 'ARUA', 'AUAR', 'A URA'] },
    { target: 'ZESTY', decoys: ['ZESTTY', 'ZSETY', 'ZESYT', 'ZEST Y'] },
    { target: 'GYATT', decoys: ['GYATTT', 'GAYTT', 'GYTAT', 'GY ATT'] },
    { target: 'W RIZZ', decoys: ['M RIZZ', 'W RIZ', 'W RIZZZ', 'VV RIZZ'] },
  ];

  const COMBO_CALLOUTS = ['ON FIRE!', 'UNSTOPPABLE!', 'LOCKED IN!', 'DEMON MODE!', 'NO CAP!'];

  const SPEED_SAYS_VERBS = ['CLICK', 'SMASH', 'TAP IT', 'GO', 'MASH IT', 'HIT IT'];
  const SPEED_SAYS_BAIT = ['CLICK NOW', 'QUICK, CLICK!', "DON'T WAIT — CLICK", 'EVERYONE CLICKS', 'JUST CLICK IT', 'GO GO CLICK'];

  const ROUND_ICONS = { type: '🔤', rageclick: '🖱️', reaction: '⚡', bait: '🎣', speedsays: '🗣️' };
  const ROUND_LABELS = { type: 'TYPE IT FAST', rageclick: 'RAGE CLICK', reaction: 'REACTION', bait: 'BAIT & SWITCH', speedsays: 'SPEED SAYS' };

  const ROUND_TYPES = ['type', 'rageclick', 'reaction', 'bait', 'speedsays'];

  let sfxOn = localStorage.getItem(SFX_KEY) !== '0';
  let audioCtx = null;

  function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function playTone(freq, duration, opts = {}) {
    if (!sfxOn) return;
    const { type = 'sine', gain = 0.2, delay = 0 } = opts;
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.connect(g).connect(ctx.destination);
    const t0 = ctx.currentTime + delay;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  const sfx = {
    success() {
      playTone(660, 0.09, { type: 'triangle', gain: 0.18 });
      playTone(880, 0.12, { type: 'triangle', gain: 0.15, delay: 0.06 });
    },
    fail() {
      playTone(160, 0.22, { type: 'sawtooth', gain: 0.18 });
      playTone(110, 0.25, { type: 'sawtooth', gain: 0.15, delay: 0.05 });
    },
    tick() {
      playTone(1200, 0.03, { type: 'square', gain: 0.04 });
    },
    milestone() {
      [523, 659, 784, 1046].forEach((f, i) => playTone(f, 0.15, { type: 'triangle', gain: 0.2, delay: i * 0.07 }));
    },
    start() {
      playTone(440, 0.1, { type: 'triangle', gain: 0.15 });
    },
  };

  function vibrate(pattern) {
    if (!sfxOn) return;
    if (navigator.vibrate) navigator.vibrate(pattern);
  }

  function updateSfxButton() {
    el.btnSfx.textContent = sfxOn ? '🔊' : '🔇';
  }

  el.btnSfx.addEventListener('click', () => {
    sfxOn = !sfxOn;
    localStorage.setItem(SFX_KEY, sfxOn ? '1' : '0');
    updateSfxButton();
  });
  updateSfxButton();

  function onTap(element, handler) {
    const onPointerDown = (e) => {
      e.preventDefault();
      handler(e);
    };
    element.addEventListener('pointerdown', onPointerDown);
    return () => element.removeEventListener('pointerdown', onPointerDown);
  }

  let state;

  function resetState() {
    state = {
      round: 0,
      score: 0,
      lives: 3,
      streak: 0,
      bestStreak: 0,
      roundsCleared: 0,
      lastType: null,
      resolved: false,
      cleanup: null,
      onTimeout: null,
      rafId: null,
    };
  }

  function getRoundTime(round) {
    return Math.max(1.5, 5 - (round - 1) * 0.5);
  }

  function getRageTarget(round) {
    return Math.min(26, 8 + Math.floor(round * 1.5));
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
    getAudioCtx();
    resetState();
    updateHud();
    el.feedback.textContent = '';
    el.feedback.className = 'feedback';
    showScreen(el.screenGame);
    sfx.start();
    nextRound();
  }

  function nextRound() {
    state.round += 1;
    updateHud();
    const type = pickRoundType();
    showRoundIntro(type, () => {
      state.resolved = false;
      const duration = getRoundTime(state.round);
      renderChallenge(type, () => startTimer(duration));
    });
  }

  function showRoundIntro(type, callback) {
    state.onTimeout = null;
    el.challengeArea.innerHTML = `<div class="intro-icon">${ROUND_ICONS[type]}</div>`;
    el.challengeLabel.textContent = ROUND_LABELS[type];
    el.challengeLabel.classList.remove('intro');
    void el.challengeLabel.offsetWidth;
    el.challengeLabel.classList.add('intro');
    el.timerBar.style.width = '100%';
    el.timerBar.style.background = 'var(--green)';
    setTimeout(callback, 320);
  }

  function startTimer(duration) {
    const startTime = performance.now();

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
        if (state.onTimeout) state.onTimeout();
        else resolveRound(false, 'timeout');
        return;
      }
      state.rafId = requestAnimationFrame(tick);
    }
    state.rafId = requestAnimationFrame(tick);
  }

  function showComboBanner(text) {
    const banner = document.createElement('div');
    banner.className = 'combo-banner';
    banner.textContent = text;
    el.challengeArea.appendChild(banner);
    setTimeout(() => banner.remove(), 700);
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
      state.bestStreak = Math.max(state.bestStreak, state.streak);
      state.roundsCleared += 1;
      const multiplier = 1 + Math.min(state.streak, 10) * 0.1;
      const points = Math.round((basePoints + timeBonus) * multiplier);
      state.score += points;
      const fire = state.streak >= 3 ? ' ' + '🔥'.repeat(Math.min(state.streak - 2, 5)) : '';
      el.feedback.textContent = `+${points} · streak ${state.streak}${fire}`;
      el.feedback.className = 'feedback good';
      el.challengeArea.classList.remove('flash-bad', 'shake');
      void el.challengeArea.offsetWidth;
      el.challengeArea.classList.add('flash-good');
      sfx.success();
      vibrate(15);
      if (state.streak > 0 && state.streak % 5 === 0) {
        sfx.milestone();
        showComboBanner(pick(COMBO_CALLOUTS));
      }
    } else {
      state.streak = 0;
      state.lives -= 1;
      const messages = {
        timeout: 'TOO SLOW',
        wrong: 'GOT BAITED',
        early: 'JUMPED THE GUN',
      };
      el.feedback.textContent = messages[reason] || 'FAIL';
      el.feedback.className = 'feedback bad';
      el.challengeArea.classList.remove('flash-good');
      void el.challengeArea.offsetWidth;
      el.challengeArea.classList.add('flash-bad', 'shake');
      sfx.fail();
      vibrate([30, 40, 30]);
    }

    updateHud();

    if (state.lives <= 0) {
      setTimeout(() => gameOver(success === false ? reasonText(reason) : ''), 650);
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

  function loadHistory() {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function renderHistory() {
    const history = loadHistory();
    if (!history.length) {
      el.historyRow.classList.add('hidden');
      return;
    }
    el.historyRow.classList.remove('hidden');
    el.historyRow.innerHTML = history.map((h) => `<span class="chip">${h}</span>`).join('');
  }

  function gameOver(reason) {
    const highScore = parseInt(localStorage.getItem(HIGHSCORE_KEY) || '0', 10);
    const isNewHigh = state.score > highScore;
    if (isNewHigh) {
      localStorage.setItem(HIGHSCORE_KEY, String(state.score));
    }

    const bestStreakEver = parseInt(localStorage.getItem(BEST_STREAK_KEY) || '0', 10);
    if (state.bestStreak > bestStreakEver) {
      localStorage.setItem(BEST_STREAK_KEY, String(state.bestStreak));
    }

    const history = loadHistory();
    history.unshift(state.score);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 5)));

    el.finalScore.textContent = state.score;
    el.overReason.textContent = reason || '';
    el.newHigh.classList.toggle('hidden', !isNewHigh);
    el.overBestStreak.textContent = state.bestStreak;
    el.overRoundsCleared.textContent = state.roundsCleared;
    showScreen(el.screenOver);
  }

  function renderChallenge(type, start) {
    el.challengeArea.innerHTML = '';
    el.feedback.textContent = '';
    el.feedback.className = 'feedback';

    if (type === 'type') {
      renderTypeFast(start);
    } else {
      if (type === 'rageclick') renderRageClick();
      else if (type === 'reaction') renderReaction();
      else if (type === 'bait') renderBait();
      else if (type === 'speedsays') renderSpeedSays();
      start();
    }
  }

  function renderTypeFast(start) {
    const phrase = pick(TYPE_PHRASES);

    const phraseEl = document.createElement('div');
    phraseEl.className = 'type-phrase';
    phraseEl.textContent = phrase;

    const input = document.createElement('input');
    input.className = 'type-input waiting';
    input.type = 'text';
    input.autocomplete = 'off';
    input.autocapitalize = 'characters';
    input.enterKeyHint = 'done';
    input.spellcheck = false;
    input.placeholder = 'TAP TO TYPE';

    // Mobile browsers ignore focus() unless it comes from a user gesture, so the
    // round timer must not start until the player actually taps in and the
    // keyboard opens — otherwise short rounds are unwinnable on a phone.
    let started = false;
    function begin() {
      if (started) return;
      started = true;
      input.classList.remove('waiting');
      input.placeholder = '';
      start();
    }

    function onInput() {
      begin();
      const val = input.value.trim().toUpperCase();
      if (val === phrase) {
        resolveRound(true);
      }
    }
    input.addEventListener('input', onInput);
    input.addEventListener('focus', begin);

    el.challengeArea.appendChild(phraseEl);
    el.challengeArea.appendChild(input);
    setTimeout(() => input.focus(), 30);

    state.cleanup = () => {
      input.removeEventListener('input', onInput);
      input.removeEventListener('focus', begin);
    };
  }

  function renderRageClick() {
    const target = getRageTarget(state.round);
    let count = 0;

    const countEl = document.createElement('div');
    countEl.className = 'rage-count';
    countEl.innerHTML = `<span>0</span> / ${target}`;

    const btn = document.createElement('button');
    btn.className = 'rage-btn';
    btn.textContent = 'MASH';

    const offTap = onTap(btn, () => {
      count += 1;
      countEl.innerHTML = `<span>${count}</span> / ${target}`;
      const jitter = () => `translate(${Math.random() * 16 - 8}px, ${Math.random() * 16 - 8}px)`;
      btn.style.transform = jitter();
      sfx.tick();
      if (count >= target) {
        resolveRound(true);
      }
    });

    el.challengeArea.appendChild(countEl);
    el.challengeArea.appendChild(btn);

    state.cleanup = offTap;
  }

  function renderReaction() {
    const duration = getRoundTime(state.round);

    const box = document.createElement('div');
    box.className = 'reaction-box wait';
    box.textContent = 'WAIT...';

    let phase = 'wait';
    let goTime = 0;

    const minDelay = 500;
    const maxDelay = Math.max(minDelay + 200, duration * 1000 - 900);
    const delay = minDelay + Math.random() * (maxDelay - minDelay);

    const delayTimeout = setTimeout(() => {
      phase = 'go';
      goTime = performance.now();
      box.className = 'reaction-box go';
      box.textContent = 'CLICK!';
    }, delay);

    const offTap = onTap(box, () => {
      if (phase === 'wait') {
        resolveRound(false, 'early');
        return;
      }
      const reactionMs = Math.round(performance.now() - goTime);
      el.feedback.textContent = `${reactionMs}ms`;
      resolveRound(true);
    });

    el.challengeArea.appendChild(box);

    state.cleanup = () => {
      clearTimeout(delayTimeout);
      offTap();
    };
  }

  function renderBait() {
    const set = pick(BAIT_SETS);
    const decoyCount = state.round >= 6 ? 4 : 3;
    const decoys = shuffle(set.decoys).slice(0, decoyCount);
    const options = shuffle([set.target, ...decoys]);

    const instruction = document.createElement('div');
    instruction.className = 'bait-instruction';
    instruction.innerHTML = `Click <b>${set.target}</b> — not the lookalikes`;

    const grid = document.createElement('div');
    grid.className = 'bait-grid';

    const cleanups = [];
    options.forEach((label) => {
      const btn = document.createElement('button');
      btn.className = 'bait-btn';
      btn.textContent = label;
      const off = onTap(btn, () => {
        if (label === set.target) resolveRound(true);
        else resolveRound(false, 'wrong');
      });
      cleanups.push(off);
      grid.appendChild(btn);
    });

    el.challengeArea.appendChild(instruction);
    el.challengeArea.appendChild(grid);

    state.cleanup = () => cleanups.forEach((fn) => fn());
  }

  function renderSpeedSays() {
    const isLegit = Math.random() < 0.5;
    const text = isLegit ? `SPEED SAYS: ${pick(SPEED_SAYS_VERBS)}` : pick(SPEED_SAYS_BAIT);

    const instruction = document.createElement('div');
    instruction.className = 'speedsays-instruction';
    instruction.textContent = text;

    const btn = document.createElement('button');
    btn.className = 'speedsays-btn';
    btn.textContent = 'DO IT';

    const offTap = onTap(btn, () => {
      if (isLegit) resolveRound(true);
      else resolveRound(false, 'wrong');
    });

    el.challengeArea.appendChild(instruction);
    el.challengeArea.appendChild(btn);

    state.cleanup = offTap;
    state.onTimeout = () => {
      if (isLegit) resolveRound(false, 'timeout');
      else resolveRound(true);
    };
  }

  function initStartScreen() {
    const highScore = parseInt(localStorage.getItem(HIGHSCORE_KEY) || '0', 10);
    const bestStreakEver = parseInt(localStorage.getItem(BEST_STREAK_KEY) || '0', 10);
    el.highscoreValue.textContent = highScore;
    el.beststreakValue.textContent = bestStreakEver;
    renderHistory();
  }

  el.btnStart.addEventListener('click', startGame);
  el.btnRestart.addEventListener('click', () => {
    initStartScreen();
    startGame();
  });

  initStartScreen();
})();
