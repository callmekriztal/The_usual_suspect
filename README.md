# The_usual_suspect
> *Every case needs a suspect.*

A single-page, browser-native psychological detective mystery game. You sit before an aging ThinkPad with a case directory:
`CASE_09 / Subject: Nila / Status: MISSING / Last contact: 23:41`.

Investigate using realistic surveillance tools: Unix terminal log analysis, timeline message scrubbing, analog radio tuning, and surveillance photo metadata inspection. Connect contradictory evidence on an interactive corkboard with yarn strands, resolve the mystery of the watcher, and face the final choice.

---

## 🔍 Gameplay & Investigative Strands

The investigation unfolds through four core evidentiary strands running inside a simulated retro desktop environment:

1. **Terminal Access Logs (`~/CASE_09/logs/access.log`)**
   - Filter through routine sync noise (`grep -v "sync ok" ...`) to reveal hidden forwarding rules, anomalous daemon operations, and account deactivations.
   - Interactive token highlighting allows clicking or pinning discovered evidence directly to the board.

2. **Intercepted Messages Scrubber**
   - Chronological message scrub bar across Signal, WhatsApp, and SMS channels.
   - Cross-reference alibis against Bengaluru airport public markers and timestamped text messages.

3. **Audio Player & Oscilloscope (`rec_0912_2236.wav`)**
   - Real-time Canvas 2D oscilloscope visualization with procedural noise and wave carriers.
   - Analog frequency dial sweep across target radio bands (18 MHz, 52 MHz, 81 MHz).
   - Dynamic text de-scramble and a 1-second hold-to-lock mechanism to recover audio surveillance memos.

4. **Surveillance Photo Metadata**
   - Inspect timestamped photograph evidence in `~/CASE_09/evidence/photos`.
   - Analyze camera EXIF data and SIM device identifiers to discover contradictions between statements and physical sightings.

5. **Interactive Evidence Board**
   - Pin discovered evidence cards from all four applications.
   - Draw yarn strands between pinned items to expose direct contradictions.
   - Deduce the identity of the device owner behind `DEV-7F3A`.

6. **The Reveal ("The Flip") & Dual Endings**
   - Discovering the true subject triggers a dramatic 7-second monotonic reveal sequence, complete with audio cut, CRT skin-swap, and identity synchronization.
   - **`[ CLOSE CASE ]`**: Transactionally deletes all 41 surveillance files across the virtual file system, ceases background daemon monitoring, and closes the case.
   - **`[ OPEN CASE_10 ]`**: Reinitializes the cycle by creating 22 mirror files in `~/CASE_10/` and leaving the background daemon running.

---

## 🛠️ Architecture & Tech Stack

Built from the ground up without heavy UI frameworks:

- **Core & Build**: TypeScript 5.7, Vite 6
- **Desktop Window Manager**: Custom vanilla DOM window management system with draggable windows, taskbar, dock, and z-index ordering.
- **In-Memory Virtual File System (VFS)**: Complete POSIX-like directory and file tree with path resolution, permission masks, locked node tracking, root aliases, and transactional atomic snapshot/restore capabilities.
- **State Machine**: Deterministic finite state machine with truth progression levels (0 to 3), monotonic reveal guards, and atomic session persistence with staging cleanup.
- **Evidence Board**: Interactive SVG yarn strand renderer and canvas layout.
- **Audio Synthesizer**: Web Audio API engine simulating dual-oscillator laptop fan hum, bandpass-filtered radio static that calms upon tuning, mechanical key ticks, and pin drop sounds.
- **Retro CRT Atmosphere**: Discrete stepped animations (`steps()`), raster scanlines, custom beveled scrollbars, and full `prefers-reduced-motion` compliance.
- **Testing**: Vitest unit & integration test suites, Playwright & BiDi headless browser automation.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm

### Installation & Development
```bash
# Clone the repository
git clone https://github.com/callmekriztal/The_usual_suspect.git
cd The_usual_suspect

# Install dependencies
npm install

# Start local development server
npm run dev
```

Open your browser at `http://localhost:5173` to start investigating.

---

## 🧪 Testing & Verification

The_usual_suspect has a comprehensive automated and browser test suite:

```bash
# Run Vitest test suite (179 tests across 13 suites)
npm test

# Typecheck TypeScript source
npm run typecheck

# Production build
npm run build

# Preview production build locally
npm run preview
```

---

## ⚡ URL Shortcuts (Demo & Testing)

To assist with evaluation, testing, and demonstration, the game provides URL query parameters:

- **`?reset`**: Clears all local storage session state and boots into a clean `CASE_09` initial state.
  ```
  http://localhost:5173/?reset
  ```
- **`?solve=log,timeline`**: Pre-pins evidence to satisfy specified strands (`log`, `timeline`, or `audio`), automatically unlocking surveillance photos.
  ```
  http://localhost:5173/?solve=log,timeline
  ```
- **`?truth=2`**: Advances directly to truth level 2 with surveillance photos unlocked and pins connected on the evidence board.
  ```
  http://localhost:5173/?truth=2
  ```
- **`?truth=3`**: Advances directly to the post-reveal flipped state with the central owner resolved, audio recording unlocked, and both ending choices accessible.
  ```
  http://localhost:5173/?truth=3
  ```

---

## 📂 Project Structure

```
find_u/
├── src/
│   ├── audio/         # Web Audio API synthesizer (fan drone, radio static, sound effects)
│   ├── content/       # Canonical game data (recordings, photos, messages, logs)
│   ├── engine/        # VFS, GameStateMachine, EndingCoordinator, command executor, storage
│   ├── ui/
│   │   ├── apps/      # Terminal, Messages Scrubber, Audio Player, Files, Evidence Board
│   │   ├── fx/        # Scramble text reveals, CRT effects
│   │   └── shell.ts   # Window manager, taskbar, desktop shell
│   └── main.ts        # App bootstrap, shortcut handler, skin-swap coordinator
├── tests/             # Automated Vitest test suites (179 tests)
├── dist/              # Production build output
└── index.html         # Application shell & boot screen
```

---

## 📜 License

Private project. All rights reserved.
