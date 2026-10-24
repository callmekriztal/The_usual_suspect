# DEAD PIXELS: Development Plan

*Master Implementation Plan derived from `DEAD_PIXELS_Build_Bible_v4.md`*

---

## 1. Project Overview & Architecture

- **Format:** Single-page browser game, 10–15 min playtime (6-min judge demo).
- **Core Narrative Premise:** Detective investigation into missing subject Nila (`CASE_09`). The player uncovers surveillance logs, mirrored message threads, tuned audio, and external photos. The final question (*who owns the surveillance device?*) reveals that the player character (Adi) is the stalker, and the investigation was an elaborate excuse to continue watching her after she left.
- **Tech Stack (Locked):**
  - **Build System:** Vite + TypeScript
  - **Interface:** Vanilla DOM + CSS (1px bevelled chrome, no bloated UI frameworks)
  - **Evidence Board:** SVG (pins, nodes, quadratic curve strings with tension/sagging)
  - **Canvas 2D (strictly limited):** Oscilloscope waveform & pixel dissolve transitions only
  - **Animation:** CSS stepped keyframes + minimal TypeScript `fx` module (scramble, token flash, slice glitch)
  - **Audio:** Web Audio API (synthesized ambient hum, clicks, scope static) + optional recorded voice
  - **State:** In-memory reactive store mirrored to `localStorage`
  - **Testing:** Vitest for headless engine/content/strands/playthrough; Playwright for browser e2e
  - **Forbidden Dependencies:** Phaser, PixiJS, GSAP, Motion, Proton, UI component libraries, external font/image CDNs.

---

## 2. Development Stages, Requirements & Acceptance Gates

### Stage 0: Inspection, Plan & Minimal Scaffold (Current Stage)
- **Requirements:**
  - Inspect workspace for existing files and report them without destructive overwriting.
  - Review `DEAD_PIXELS_Build_Bible_v4.md`, `frontend-design`, and `webapp-testing` skills.
  - Create `PLAN.md` with full stage mappings, acceptance criteria, and test definitions.
  - Scaffold Vite + TypeScript project structure with zero production runtime dependencies.
  - Establish basic shell (HTML, base CSS tokens, minimal `main.ts`, `types.ts`).
  - Run initial build/test verification and report results.
- **Gate Criteria:** `npm run build` (tsc + vite) and `npm test` execute cleanly with 0 errors.

---

### Stage 1: Content Verbatim & Content Lint
- **Estimated Duration:** 30 min
- **Dependencies:** Stage 0 scaffold
- **Requirements:**
  - Copy all narrative content verbatim from Section 7 of Build Bible into `src/content/`:
    - `filesystem.ts`: virtual tree with boot files, `READ_ME_FIRST.txt`, `CASE_01` to `CASE_08` (`closed.txt`), `evidence/suspects.txt`, `notes/todo.txt`, `sysinfo`.
    - `messages.ts`: mirrored chat between Nila and Sana, and texts from `…4471`.
    - `photos.ts`: six photo metadata records (`DEV-7F3A`, `SIM2 ...4471`).
    - `recordings.ts`: tuned static fragments 1, 2, 3 and `last_recording.wav`.
    - `skin.ts`: `data-case` to `data-real` mapping dictionary.
    - `endings.ts`: CLOSE CASE and OPEN CASE_10 termination texts.
  - Build `scripts/gen-log.ts` to deterministically generate ~1,200 routine log lines interspersed with the exact 5 anomaly lines in order, ending with `sync final`.
  - Create `cases/closed_archive.txt` with eight cases mapping `theory:` to `excuse:`.
- **Gate Criteria (Content Lint):**
  - Every `data-case` token has a corresponding `data-real` entry.
  - The string "Kiran" appears in NO message sent by Nila or Sana.
  - Every `CASE_01` through `CASE_08` contains both a `theory:` and `reason:`.
  - `DEV-7F3A` and `4471` appear in at least 3 separate content sources.
  - Every pinnable identifier exists in the content registry.
  - All content files are under 120 words (except the generated access log and `closed_archive.txt`).
  - The 5 anomaly lines appear chronologically in the generated log and survive `grep -v "sync ok"`.
  - Content lint test (`tests/content.test.ts`) passes 100%.

---

### Stage 2: Engine Core (VFS, Commands, Token Registry)
- **Estimated Duration:** 60 min
- **Dependencies:** Stage 1 content
- **Requirements:**
  - `src/engine/vfs.ts`: Virtual file system supporting directories, file read/stat, hidden files, locks (`evidence/photos/` locked until 2 strands solved).
  - `src/engine/commands.ts`: Terminal commands parser: `help`, `ls`, `cd`, `pwd`, `cat`, `grep` (supporting `-v`, `-c`, `-i`, `-r`), `head`, `tail`, `wc`, `pin`, `sysinfo`, `ps`.
  - `src/engine/tokens.ts`: Global token registry for `DEV-…` hostnames and phone numbers (`…4471`).
- **Gate Criteria:**
  - Unit tests in `tests/engine.test.ts`:
    - `grep -v "sync ok" logs/access.log` returns exactly 5 anomaly lines + 1 `sync final` line.
    - `grep -c` correctly counts occurrences.
    - `pin <id>` correctly registers and deduplicates pins.
    - Locked paths refuse `cat` with in-world error message.
    - Unknown terminal commands produce in-world error message without throwing unhandled exceptions.

---

### Stage 3: State Machine, Strands, Truth Transitions & Owner Logic
- **Estimated Duration:** 35 min
- **Dependencies:** Stage 2 engine
- **Requirements:**
  - `src/engine/state.ts`: Headless state store holding `pins`, `strands`, `photosOpened`, `truth` (0, 1, 2, 3), `ownerSolved`, `recordingDone`, `ending`.
  - `src/engine/strands.ts`: Strand completion rules:
    - LOG strand: pinned `forward rule 8 Sep` AND (`DEV-19C2 login` OR `Kiran deactivated`).
    - TIMELINE strand: pinned `22:10 Bengaluru marker` AND `4471 message >= 22:40`.
    - AUDIO strand: pinned all 3 tuned audio fragments.
  - `src/engine/owner.ts`: Owner input validation:
    - Accepted: `adi`, `me`, `myself`, `mine`, `i`, `you`, `this laptop`, `my laptop`.
    - Rejections with diegetic feedback: `kiran`, `unknown`/blank, default invalid.
- **Gate Criteria:**
  - Headless golden-path test (`tests/playthrough.test.ts`) completes cleanly through both endings.
  - Strand order independence verified across all 6 permutations.
  - Photos unlock only when at least 2 strands are solved.
  - Owner resolution moves state to `truth = 3`.
  - Endings gate on reading `cases/closed_archive.txt` after recording finishes.

---

### Stage 4: Terminal UI Application
- **Estimated Duration:** 35 min
- **Dependencies:** Stage 3 engine
- **Requirements:**
  - `src/ui/apps/terminal.ts`: Render terminal window in DOM.
  - Interactive prompt, caret rendering, command history navigation (Up/Down arrow keys).
  - Integrated `pin` command that pushes pins into active state.
- **Gate Criteria:**
  - Playwright test: user can type command, view history with Up arrow, execute `grep -v`, run `pin`, and view output without browser console errors.

---

### Stage 5: Desktop Shell, Window Manager, Taskbar & Token Flash
- **Estimated Duration:** 60 min
- **Dependencies:** Stage 4 UI
- **Requirements:**
  - `src/ui/windowManager.ts`: Drag by title bar, focus/stacking z-index, minimize, restore, close.
  - `src/ui/taskbar.ts`: System tray displaying `ADI-THINKPAD · DEV-7F3A`, battery 23%, no-network icon, active clock, audio mute toggle.
  - `src/ui/fx/flash.ts`: Global token linking mechanic — clicking any `data-tok` flashes all visible occurrences across windows and tray for 600ms.
- **Gate Criteria:**
  - Window drag, minimize, restore, and focus functional.
  - Clicking `DEV-7F3A` flashes at least 3 distinct elements across the UI.
  - Layout stable and responsive at 1280×720 viewport.

---

### Stage 6: Messages Scrubber Application
- **Estimated Duration:** 35 min
- **Dependencies:** Stage 5 shell
- **Requirements:**
  - `src/ui/apps/messages.ts`: Timeline rail for 12 Sep (20:00 to 23:59) with draggable playhead.
  - Interleaved chat messages (Nila/Sana and …4471 texts).
  - Reveal count is monotonic (scrubbing backwards does not erase revealed messages).
  - Keyboard accessible playhead scrubbing.
- **Gate Criteria:**
  - Scrubbing to 22:41 displays airport marker and downstairs text.
  - Pinning 22:10 Bengaluru marker and 22:40 message sets TIMELINE strand to solved.

---

### Stage 7: Audio Player Application & Oscilloscope
- **Estimated Duration:** 30 min
- **Dependencies:** Stage 5 shell
- **Requirements:**
  - `src/ui/apps/player.ts`: Horizontal tuning dial (0 to 100).
  - Oscilloscope Canvas 2D displaying noise amplitude driven by dial proximity to targets (~18, ~52, ~81).
  - `scrambleReveal()`: Scrambled glyphs de-scramble into clean text within tolerance after 1-second hold.
- **Gate Criteria:**
  - Locking all 3 fragments auto-pins them and solves AUDIO strand.
  - Oscilloscope scales noise dynamically with dial distance.

---

### Stage 8: Files Explorer, Photos & Metadata Inspection
- **Estimated Duration:** 20 min
- **Dependencies:** Stage 5 shell
- **Requirements:**
  - `src/ui/apps/files.ts`: File explorer browsing virtual filesystem.
  - `evidence/photos/` folder locked until 2 strands are solved.
  - Photo viewer with Inspect tab showing device `DEV-7F3A` and `SIM2 ...4471`.
  - Opening photos folder elevates state to `truth = 2`.
- **Gate Criteria:**
  - Folder lock drops off when 2 strands complete.
  - Inspect tab exposes tokens `DEV-7F3A` and `4471`.
  - Opening folder triggers `truth = 2` (showing real labels on pin hover).

---

### Stage 9: SVG Evidence Board, The Flip & Ending Flows
- **Estimated Duration:** 70 min
- **Dependencies:** Stages 6, 7, 8
- **Requirements:**
  - `src/ui/apps/board.ts`: SVG evidence board with cards, pins, and quadratic curves (`<path>`).
  - Wire up dynamic strings: taut on initial solve, sagging on contradiction, snapping on false theory.
  - Owner input node `DEV-7F3A / OWNER: ____`.
  - **The Flip (Section 6 sequence):**
    - 0.0s: Brightness dip, ambient hum cuts to silence.
    - 0.3s: Strings detach, swing, and re-anchor to central node YOU; Nila node shrinks to edge.
    - 1.5s: 6-strip slice glitch displacement for 400ms.
    - 2.0s: Skin swap (`data-case` scrambles into `data-real`, amber becomes grey, stamps vanish).
    - 4.0s: Silence for 2 seconds.
    - 6.0s: `last_recording.wav` appears on desktop; notes to-do list clears.
  - Final recording player, archive window (`cases/closed_archive.txt`), and dual endings:
    - CLOSE CASE: Confirmation dialog, files deleted, `mirror.py` stopped, dissolve to clean wallpaper.
    - OPEN CASE_10: Board wiped, `CASE_10/` created, system resets to case skin with `mirror.py: running`.
- **Gate Criteria:**
  - The Flip executes cleanly in the exact specified 7-second sequence.
  - Reduced motion respects immediate fade alternative.
  - Both endings reachable from fresh state and via test runner.

---

### Stage 10: Audio Synthesis & Motion Polish
- **Estimated Duration:** 40 min
- **Dependencies:** Stage 9
- **Requirements:**
  - `src/audio/synth.ts`: Web Audio API synthesizer for ambient fan hum, typing ticks, pin drop, and radio static.
  - Audio muting and graceful degradation if audio context is blocked.
  - Stepped CSS animations (`steps()`), no general easing or smooth animations.
- **Gate Criteria:**
  - Complete test suite passes with Web Audio enabled and blocked.
  - `prefers-reduced-motion` fully suppresses slice glitch and stepped string swings.

---

### Stage 11: Demo Hardening, Shortcuts & Verification
- **Estimated Duration:** 35 min
- **Dependencies:** Stage 10
- **Requirements:**
  - URL query parameter shortcuts:
    - `?reset`: Clears `localStorage` and resets state.
    - `?solve=log,timeline`: Pre-solves specified strands for rapid testing.
    - `?truth=2` / `?truth=3`: Jump directly to flip/reveal.
  - 1280×720 viewport hardening.
  - Full end-to-end playthrough recorded and documented.
- **Gate Criteria:**
  - All test suites green (Vitest unit tests, Playwright browser tests).
  - Clean production build (`npm run build`).

---

## 3. Contingency & Cut Order (Section 12)

If build time constraints arise, features will be cut strictly in this predefined order:
1. **Boot Screen Rain:** (Cut first; simple canvas particle rain).
2. **Audio Dial:** (Replace dial with basic terminal `play` command revealing fragments).
3. **Photo Dithering:** (Display grey metadata frame rather than dithered campus images).
4. **Dead Pixel Div & Ending Dissolve:** (Replace canvas dissolve with clean CSS fade).

**Non-Negotiable Core (Never Cut):**
- Global token flash mechanic.
- Messages timeline scrubber.
- SVG Evidence Board with sagging strings.
- The 7-second Flip set piece.
- Dynamic to-do note strike-throughs.
- Archive reveal (`cases/closed_archive.txt`).
- Dual endings (CLOSE CASE vs OPEN CASE_10).
