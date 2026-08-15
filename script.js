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
  const DIFFICULTY_KEY = 'speedSays_difficulty';
  const HAS_PLAYED_KEY = 'speedSays_hasPlayed';

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
    diffButtons: Array.from(document.querySelectorAll('.diff-btn')),
    hudRound: document.getElementById('hud-round'),
    hudScore: document.getElementById('hud-score'),
    hudLives: document.getElementById('hud-lives'),
    practiceBanner: document.getElementById('practice-banner'),
    practiceProgress: document.getElementById('practice-progress'),
    btnSkipPractice: document.getElementById('btn-skip-practice'),
    timerTrack: document.getElementById('timer-track'),
    timerBar: document.getElementById('timer-bar'),
    challengeLabel: document.getElementById('challenge-label'),
    challengeArea: document.getElementById('challenge-area'),
    feedback: document.getElementById('feedback'),
    overReason: document.getElementById('over-reason'),
    finalScore: document.getElementById('final-score'),
    newHigh: document.getElementById('new-high'),
    overBestStreak: document.getElementById('over-best-streak'),
    overRoundsCleared: document.getElementById('over-rounds-cleared'),
    btnShare: document.getElementById('btn-share'),
    shareStatus: document.getElementById('share-status'),
    keyboardDock: document.getElementById('keyboard-dock'),
  };

  const TYPE_PHRASES = [
    'SYBAU', 'LOCK IN', 'SIUUUU', 'MOGGED', 'ITS THE WATER', 'GYATT',
    'NO CAP', 'RAAAHH', 'GOATED', 'SHEEESH', 'GOOFY AHH', 'BROSKI', 'RIZZLER',
    'ZESTY', 'DEMON TIME', 'W RIZZ', 'L TAKE', 'MEWING', 'CHOPPED', 'AURA FARM',
  ];

  const KEYBOARD_ROWS = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
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

  const CHAT_WORDS = ['RIZZ', 'GYATT', 'SYBAU', 'MOGGED', 'GOATED', 'SIUUU', 'NO CAP', 'RAAAHH', 'ZESTY', 'CHOPPED', 'SHEEESH', 'BROSKI'];

  const ROUND_ICONS = { type: '🔤', rageclick: '🖱️', reaction: '⚡', bait: '🎣', speedsays: '🗣️', chatspam: '💬' };
  const ROUND_LABELS = { type: 'TYPE IT FAST', rageclick: 'RAGE CLICK', reaction: 'REACTION', bait: 'BAIT & SWITCH', speedsays: 'SPEED SAYS', chatspam: 'CHAT SPAM' };

  const ROUND_TYPES = ['type', 'rageclick', 'reaction', 'bait', 'speedsays', 'chatspam'];
  const PRACTICE_TYPES = ['type', 'rageclick', 'reaction', 'bait', 'speedsays', 'chatspam'];

  const DIFFICULTIES = {
    chill: { start: 7, floor: 2.5, step: 0.5 },
    normal: { start: 5, floor: 1.5, step: 0.5 },
    insane: { start: 3.5, floor: 1, step: 0.4 },
  };

  let difficulty = DIFFICULTIES[localStorage.getItem(DIFFICULTY_KEY)] ? localStorage.getItem(DIFFICULTY_KEY) : 'normal';

  function setDifficulty(diff) {
    difficulty = diff;
    localStorage.setItem(DIFFICULTY_KEY, diff);
    el.diffButtons.forEach((btn) => btn.classList.toggle('active', btn.dataset.diff === diff));
  }

  el.diffButtons.forEach((btn) => {
    btn.addEventListener('click', () => setDifficulty(btn.dataset.diff));
  });

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
    wrongKey() {
      playTone(220, 0.06, { type: 'square', gain: 0.08 });
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

  // pointerdown gives pointer/touch users near-zero latency. Native <button>
  // keyboard activation (Enter/Space) only ever fires 'click' though, never
  // 'pointerdown' — so it's also handled here, gated on event.detail === 0
  // (the standard tell for a keyboard-triggered click) to avoid double-firing
  // for mouse/touch users who already triggered the pointerdown handler.
  function showKeyboardDock(keyboardEl) {
    el.keyboardDock.innerHTML = '';
    el.keyboardDock.appendChild(keyboardEl);
    document.body.style.paddingBottom = `${el.keyboardDock.offsetHeight}px`;
    el.keyboardDock.classList.add('visible');
  }

  function hideKeyboardDock() {
    el.keyboardDock.classList.remove('visible');
    document.body.style.paddingBottom = '';
  }

  function onTap(element, handler) {
    const onPointerDown = (e) => {
      e.preventDefault();
      handler(e);
    };
    const onClick = (e) => {
      if (e.detail === 0) handler(e);
    };
    element.addEventListener('pointerdown', onPointerDown);
    element.addEventListener('click', onClick);
    return () => {
      element.removeEventListener('pointerdown', onPointerDown);
      element.removeEventListener('click', onClick);
    };
  }

  // Same as onTap, but the spacebar also fires the handler regardless of
  // focus — mashing the physical spacebar reads as more fun/comfortable
  // than repeatedly clicking for rounds that are just "hit the one target."
  function onTapOrSpace(element, handler) {
    const offTap = onTap(element, handler);
    const onKeydown = (e) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        handler(e);
      }
    };
    window.addEventListener('keydown', onKeydown);
    return () => {
      offTap();
      window.removeEventListener('keydown', onKeydown);
    };
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
      practiceMode: false,
      practiceIndex: 0,
    };
  }

  function getRoundTime(round) {
    const d = DIFFICULTIES[difficulty];
    return Math.max(d.floor, d.start - (round - 1) * d.step);
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
    if (!localStorage.getItem(HAS_PLAYED_KEY)) {
      beginPractice();
    } else {
      nextRound();
    }
  }

  function beginPractice() {
    state.practiceMode = true;
    state.practiceIndex = 0;
    el.screenGame.classList.add('practice-active');
    el.practiceBanner.classList.remove('hidden');
    startPracticeRound();
  }

  function startPracticeRound() {
    const type = PRACTICE_TYPES[state.practiceIndex];
    el.practiceProgress.textContent = `${state.practiceIndex + 1}/${PRACTICE_TYPES.length}`;
    showRoundIntro(type, () => {
      state.resolved = false;
      renderChallenge(type);
      startRoundTimer(type, 6);
    });
  }

  function advancePractice() {
    state.practiceIndex += 1;
    if (state.practiceIndex >= PRACTICE_TYPES.length) endPractice();
    else startPracticeRound();
  }

  function endPractice() {
    localStorage.setItem(HAS_PLAYED_KEY, '1');
    el.screenGame.classList.remove('practice-active');
    el.practiceBanner.classList.add('hidden');
    resetState();
    updateHud();
    nextRound();
  }

  el.btnSkipPractice.addEventListener('click', () => {
    if (!state.practiceMode) return;
    if (state.rafId) cancelAnimationFrame(state.rafId);
    if (state.cleanup) {
      state.cleanup();
      state.cleanup = null;
    }
    endPractice();
  });

  function nextRound() {
    state.round += 1;
    updateHud();
    const type = pickRoundType();
    showRoundIntro(type, () => {
      state.resolved = false;
      renderChallenge(type);
      startRoundTimer(type, getRoundTime(state.round));
    });
  }

  // Chat Spam has no ticking deadline of its own — it only ends when the
  // target is hit enough times, a decoy is tapped, or the target scrolls
  // fully off-screen untapped. Scroll speed (not a timer) is its difficulty
  // knob, so the shared round timer is skipped entirely for it.
  function startRoundTimer(type, duration) {
    if (type === 'chatspam') {
      el.timerTrack.classList.add('hidden');
      state.rafId = null;
      return;
    }
    el.timerTrack.classList.remove('hidden');
    startTimer(duration);
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

  function resolveRound(success, reason, extra) {
    if (state.resolved) return;
    state.resolved = true;
    if (state.rafId) cancelAnimationFrame(state.rafId);
    if (state.cleanup) {
      state.cleanup();
      state.cleanup = null;
    }

    if (state.practiceMode) {
      el.feedback.textContent = success ? 'NICE' : "THAT'S OK — KEEP GOING";
      el.feedback.className = success ? 'feedback good' : 'feedback bad';
      el.challengeArea.classList.remove('flash-bad', 'flash-good', 'shake');
      void el.challengeArea.offsetWidth;
      el.challengeArea.classList.add(success ? 'flash-good' : 'flash-bad');
      if (success) sfx.success();
      else sfx.fail();
      setTimeout(advancePractice, 700);
      return;
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
      const extraText = extra ? ` · ${extra}` : '';
      el.feedback.textContent = `+${points} · streak ${state.streak}${fire}${extraText}`;
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
        missed: 'MISSED IT',
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
      missed: 'Let the target scroll past.',
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

  function renderChallenge(type) {
    el.challengeArea.innerHTML = '';
    el.feedback.textContent = '';
    el.feedback.className = 'feedback';

    if (type === 'type') renderTypeFast();
    else if (type === 'rageclick') renderRageClick();
    else if (type === 'reaction') renderReaction();
    else if (type === 'bait') renderBait();
    else if (type === 'speedsays') renderSpeedSays();
    else if (type === 'chatspam') renderChatSpam();
  }

  // On-screen QWERTY so mobile never depends on the native keyboard (its
  // popup animation and focus-permission quirks made short rounds
  // unwinnable). Physical typing still works on desktop as a faster
  // alternative. A tap only counts if it's the correct next letter — wrong
  // taps are rejected with feedback rather than appended, so there's never
  // anything to backspace under time pressure.
  function renderTypeFast() {
    const phrase = pick(TYPE_PHRASES);
    let typed = '';

    const phraseEl = document.createElement('div');
    phraseEl.className = 'type-phrase';
    phraseEl.textContent = phrase;

    const typedEl = document.createElement('div');
    typedEl.className = 'typed-display';

    const keyboard = document.createElement('div');
    keyboard.className = 'keyboard';

    function renderTyped() {
      typedEl.innerHTML = `${typed}<span class="cursor">|</span>`;
    }
    renderTyped();

    function flashWrong() {
      typedEl.classList.remove('shake');
      void typedEl.offsetWidth;
      typedEl.classList.add('shake');
      sfx.wrongKey();
    }

    function tryChar(ch) {
      if (ch === phrase[typed.length]) {
        typed += ch;
        sfx.tick();
        renderTyped();
        if (typed === phrase) resolveRound(true);
      } else {
        flashWrong();
      }
    }

    const offTaps = [];
    KEYBOARD_ROWS.forEach((row) => {
      const rowEl = document.createElement('div');
      rowEl.className = 'keyboard-row';
      row.forEach((letter) => {
        const key = document.createElement('button');
        key.className = 'key';
        key.textContent = letter;
        offTaps.push(onTap(key, () => tryChar(letter)));
        rowEl.appendChild(key);
      });
      keyboard.appendChild(rowEl);
    });

    if (phrase.includes(' ')) {
      const spaceRow = document.createElement('div');
      spaceRow.className = 'keyboard-row';
      const spaceKey = document.createElement('button');
      spaceKey.className = 'key space';
      spaceKey.textContent = 'SPACE';
      offTaps.push(onTap(spaceKey, () => tryChar(' ')));
      spaceRow.appendChild(spaceKey);
      keyboard.appendChild(spaceRow);
    }

    function onKeydown(e) {
      if (e.key === 'Backspace' || e.key === 'Tab') {
        e.preventDefault();
        return;
      }
      const ch = e.key === ' ' ? ' ' : e.key.length === 1 ? e.key.toUpperCase() : null;
      if (ch) {
        e.preventDefault();
        tryChar(ch);
      }
    }
    window.addEventListener('keydown', onKeydown);

    el.challengeArea.appendChild(phraseEl);
    el.challengeArea.appendChild(typedEl);
    showKeyboardDock(keyboard);

    state.cleanup = () => {
      offTaps.forEach((fn) => fn());
      window.removeEventListener('keydown', onKeydown);
      hideKeyboardDock();
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

    const offTap = onTapOrSpace(btn, () => {
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

    const offTap = onTapOrSpace(box, () => {
      if (phase === 'wait') {
        resolveRound(false, 'early');
        return;
      }
      const reactionMs = Math.round(performance.now() - goTime);
      resolveRound(true, null, `${reactionMs}ms`);
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

    const offTap = onTapOrSpace(btn, () => {
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

  function chatSpamHitsNeeded(duration) {
    if (duration >= 3.5) return 3;
    if (duration >= 2) return 2;
    return 1;
  }

  // Stream-chat-style scroll: words fly across the screen and you tap only
  // the target, ignoring decoys and letting them scroll off harmlessly.
  // Tapping a decoy, or letting the target itself scroll off untapped, fails
  // the round. Under prefers-reduced-motion, falls back to a static grid
  // (same rules, no motion) so it stays winnable without relying on motion.
  function renderChatSpam() {
    const target = pick(CHAT_WORDS);
    const decoyPool = CHAT_WORDS.filter((w) => w !== target);
    const duration = getRoundTime(state.round);
    const hitsNeeded = chatSpamHitsNeeded(duration);
    let hits = 0;

    const instruction = document.createElement('div');
    instruction.className = 'chatspam-instruction';
    instruction.innerHTML = `Tap <b>${target}</b> in chat — ignore the rest (<span class="chatspam-count">0</span>/${hitsNeeded})`;
    el.challengeArea.appendChild(instruction);

    function bumpHits() {
      hits += 1;
      instruction.querySelector('.chatspam-count').textContent = hits;
      sfx.tick();
      return hits >= hitsNeeded;
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion) {
      const grid = document.createElement('div');
      grid.className = 'chatspam-grid';
      const words = shuffle([
        ...Array(hitsNeeded).fill(target),
        ...shuffle(decoyPool).slice(0, 5),
      ]);
      const cleanups = [];
      words.forEach((word) => {
        const btn = document.createElement('button');
        btn.className = 'chat-bubble chat-bubble-static';
        btn.textContent = word;
        cleanups.push(
          onTap(btn, () => {
            if (word === target) {
              if (bumpHits()) resolveRound(true);
              else btn.disabled = true;
            } else {
              resolveRound(false, 'wrong');
            }
          })
        );
        grid.appendChild(btn);
      });
      el.challengeArea.appendChild(grid);
      state.cleanup = () => cleanups.forEach((fn) => fn());
      return;
    }

    const lanes = document.createElement('div');
    lanes.className = 'chatspam-lanes';
    el.challengeArea.appendChild(lanes);

    const active = new Set();
    let spawnTimeoutId = null;
    let stopped = false;

    // Scroll speed and spawn rate both scale off the round's own timer, so a
    // bubble reliably finishes crossing the screen well inside the time
    // available — otherwise short rounds could time out before a target
    // even finished scrolling into view. Shorter rounds also get faster
    // (harder to read) bubbles, which doubles as the round's difficulty curve.
    const transitMs = Math.max(700, Math.min(2400, duration * 1000 * 0.55));
    const spawnInterval = Math.max(300, transitMs * 0.4);

    function removeEntry(entry) {
      entry.offTap();
      entry.bubble.removeEventListener('animationend', entry.onEnd);
      entry.bubble.remove();
      active.delete(entry);
    }

    function spawnMessage() {
      if (stopped || state.resolved) return;

      const isTarget = Math.random() < 0.45;
      const word = isTarget ? target : pick(decoyPool);
      const bubble = document.createElement('button');
      bubble.className = 'chat-bubble';
      bubble.textContent = word;
      bubble.style.top = `${Math.floor(Math.random() * 3) * 40}px`;
      bubble.style.animationDuration = `${transitMs * (0.85 + Math.random() * 0.3)}ms`;

      let resolvedBubble = false;

      const onEnd = () => {
        if (resolvedBubble) return;
        resolvedBubble = true;
        if (isTarget) resolveRound(false, 'missed');
        else removeEntry(entry);
      };
      bubble.addEventListener('animationend', onEnd);

      const offTap = onTap(bubble, () => {
        if (resolvedBubble) return;
        resolvedBubble = true;
        if (isTarget) {
          if (bumpHits()) resolveRound(true);
          else removeEntry(entry);
        } else {
          resolveRound(false, 'wrong');
        }
      });

      const entry = { bubble, offTap, onEnd };
      active.add(entry);
      lanes.appendChild(bubble);

      spawnTimeoutId = setTimeout(spawnMessage, spawnInterval * (0.7 + Math.random() * 0.6));
    }
    spawnMessage();

    state.cleanup = () => {
      stopped = true;
      clearTimeout(spawnTimeoutId);
      active.forEach(removeEntry);
    };
  }

  function initStartScreen() {
    const highScore = parseInt(localStorage.getItem(HIGHSCORE_KEY) || '0', 10);
    const bestStreakEver = parseInt(localStorage.getItem(BEST_STREAK_KEY) || '0', 10);
    el.highscoreValue.textContent = highScore;
    el.beststreakValue.textContent = bestStreakEver;
    renderHistory();
    setDifficulty(difficulty);
  }

  el.btnStart.addEventListener('click', startGame);
  el.btnRestart.addEventListener('click', () => {
    initStartScreen();
    startGame();
  });

  el.btnShare.addEventListener('click', async () => {
    const text = `I scored ${state.score} on Speed Says ⚡ (best streak ${state.bestStreak}). Beat me:`;
    const url = location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Speed Says', text, url });
      } catch {
        // user cancelled the share sheet — nothing to do
      }
      return;
    }
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(`${text} ${url}`);
        el.shareStatus.textContent = 'Copied!';
        setTimeout(() => {
          el.shareStatus.textContent = '';
        }, 1600);
      } catch {
        el.shareStatus.textContent = '';
      }
    }
  });

  initStartScreen();
})();
