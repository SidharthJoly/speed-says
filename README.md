# ⚡ Speed Says

A browser-based reflex game where every round could be a trap. Type fast, mash faster, react on cue, and don't fall for the bait — all while the clock ramps from 5 seconds down to 1.5.

**[▶ Play it live](https://sidharthjoly.github.io/speed-says/)** — installable as a PWA, and works offline once loaded.

![Speed Says gameplay](docs/gameplay.gif)

## How it plays

Six round types, shuffled at random, timer shrinking every round:

| Round | What you do |
|---|---|
| 🔤 **Type It Fast** | Spell the phrase on a custom on-screen keyboard (or your physical one) before time runs out |
| 🖱️ **Rage Click** | Mash a button (or spacebar) a set number of times before the clock hits zero |
| ⚡ **Reaction** | Wait for the signal to turn green, then click or hit spacebar — early and you're out |
| 🎣 **Bait & Switch** | Click the exact word among near-identical lookalikes |
| 🗣️ **Speed Says** | Only press the button (or spacebar) when the prompt starts with "SPEED SAYS" — a classic Simon Says trap |
| 💬 **Chat Spam** | Words scroll across the screen like stream chat — tap only the target word, ignore the rest, don't let it scroll past |

Three lives, scoring rewards speed and streaks (up to a 2x multiplier at a 10-round streak), and every 5-streak triggers a combo callout. High score, best streak, and your last 5 runs are saved locally so you can chase your own record.

Three difficulties (Chill / Normal / Insane) change the starting timer and how fast it ramps down. First time playing, a short no-stakes practice pass runs through all six round types before the real timer starts — skippable any time.

## Tech

Zero dependencies, zero build step — plain HTML, CSS, and JavaScript, playable straight off disk or any static host.

- Round timing and animation via `requestAnimationFrame`
- Sound effects synthesized at runtime with the Web Audio API (no audio files)
- Pointer events (not `click`) for low-latency mobile taps, plus haptic feedback via the Vibration API
- A custom on-screen QWERTY for Type It Fast instead of the native keyboard, so mobile isn't at the mercy of keyboard-popup delay or focus-permission quirks
- Every round except Chat Spam's moving targets is playable via keyboard alone (Tab + Enter/Space); all animations respect `prefers-reduced-motion`, and Chat Spam itself swaps to a static, fully keyboard-friendly grid under that preference
- Game state, high scores, streaks, difficulty, and run history persisted with `localStorage`
- Score sharing via the Web Share API, with a clipboard-copy fallback
- Installable PWA: a manifest + service worker cache the app shell so it works fully offline after the first load

## Run it locally

No build step required — just serve the folder:

```bash
git clone https://github.com/SidharthJoly/speed-says.git
cd speed-says
python3 -m http.server 8765
```

Then open `http://localhost:8765`.

## Project structure

```
index.html      markup for the three screens (start, game, game over)
style.css       theme, layout, and animations
script.js       game loop, round logic, audio engine, and persistence
manifest.json   PWA manifest
sw.js           service worker: caches the app shell for offline play
icons/          app icons (incl. maskable) generated from the theme's bolt mark
```

## License

MIT — see [LICENSE](LICENSE).
