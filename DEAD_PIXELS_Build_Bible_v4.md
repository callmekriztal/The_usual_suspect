# DEAD PIXELS: Build Bible v4

*Every case needs a suspect.*

This is the implementation-ready build specification. The Anand/Meera plot is retired. This revision finalizes the browser-game technology choices for maximum narrative interactivity within an eight-hour solo build: a custom DOM desktop, SVG evidence board, and small Canvas effects layer. It deliberately does not add a general-purpose game engine or effect libraries that duplicate the required UI.

**Format:** single-page browser game, 10 to 15 minutes (6 for a judge demo)
**Build window:** 8 hours, solo, built with Antigravity one stage at a time

---

## 1. The idea in one paragraph

You sit at a laptop with a case file: **CASE_09, subject Nila, status MISSING, last contact 23:41.** You investigate the way a detective would: filter a log, scrub through a night of messages, tune a corrupted recording, inspect photos. Every tool works, every clue fits, and you assemble a theory. The last puzzle asks one question, *who owns the device that has been watching her?*, and the answer is the laptop you're sitting at. Nila isn't missing. She moved out and changed her number because you wouldn't stop, and "the investigation" is the story that made watching her feel like work.

**The twist is the mechanic.** The puzzles are real surveillance skills, so the player does the stalking themselves while believing they're solving a crime.

**Content note (put it in the README and on the itch/demo page):** contains themes of obsessive surveillance of an ex-partner. Nothing graphic; Nila is safe and in control throughout.

---

## 2. What actually happened (the truth)

Keep this table beside you. Every file is either evidence of this timeline or Adi's distortion of it.

| Date (2026) | Event |
|---|---|
| Aug | Kiran (Nila's earlier ex) leaves college and moves to Bengaluru. |
| 2 Sep | Nila ends things with Adi and asks him to stop messaging. He promises he will. |
| 8 Sep, 02:14 | Adi, who knows her passwords, sets up `mirror.py` and a forwarding rule on her account. It syncs roughly every 15 minutes during active monitoring windows; the generated log is a selected sample, not a complete record of every interval. |
| 9 Sep | He opens CASE_01 ("she was abducted"). Over six weeks, each time the evidence shows she's fine, he opens a new case with a new theory. |
| 11 Sep, 17:52 | He photographs her hostel window from the road. |
| 12 Sep, 21:12 | Kiran's old lab laptop (DEV-19C2) logs into a shared photo account, his last login. |
| 12 Sep, 21:14 | Kiran's college accounts are deactivated (he has left). Adi will later treat this as significant. |
| 12 Sep, 22:10 | Kiran posts an airport selfie, geotagged Bengaluru. |
| 12 Sep, 22:36 | Nila records herself for the warden: someone is outside again. |
| 12 Sep, 22:40 | Texts from number …4471 ("im downstairs"). 4471 is Adi's second SIM, paired to this laptop. He has labelled it "Kiran" in his notes. |
| 14 Sep | Nila moves to her aunt's house and changes her number. The mirror keeps running on her old account. |
| 22 Oct, 23:41 | Last sync. The case file calls this "last contact." |
| 22 Oct, 23:52 | **The game begins.** |

**Why does the case say "MISSING"?** She's missing *to him*. CASE_01 to CASE_08 are not eight missing people; they are eight theories about the same woman. Each was closed when the evidence showed she was fine, and each time he opened the next with a new explanation. The explanation changed; the goal (a reason to keep looking) never did. "The investigation failed. Start again." is what he types after every one.

No amnesia, no medical cause, no supernatural frame. The only unreliable narrator is the person at the keyboard. Do not frame the ending as redemption: closing the case is only the first concrete step toward stopping the intrusion.

---

## 3. Characters

**Adi (you).** Never named in the first ten minutes. Writes as "A." Treats everything as work.

**Nila.** Calm, specific, tired. Her last message isn't a plea. It's an instruction.

**Kiran.** Real, but irrelevant. He left in August. He is the suspect Adi needs, and he exists only in Adi's notes and one public post Adi saved. His name appears in no message by Nila or Sana.

**Sana.** Nila's friend. Appears only in the mirrored chat. She is the person Nila told "I can't say."

*Names are placeholders; swap freely, but keep the device ID `DEV-7F3A` and number `4471` consistent everywhere, because they are the clues.*

---

## 4. How the story unfolds (no forced exposition)

**Rules**
1. **No cutscenes, no popups, no quest log.** Discoveries change the world instead: a file appears, a string on the Board goes slack, a label changes.
2. **Everything is gated by an action, never by reading.** The player advances by pinning, scrubbing, tuning and answering.
3. **Three entry points at the start** (terminal log, message thread, recording). Strands can be solved in any order.
4. **The player builds the wrong theory themselves,** by choosing what to pin. They own the mistake.
5. **Hints are diegetic.** The only hint system is Adi's own to-do note, which updates as the Board changes. A player who ignores it gets nothing.
6. **Nothing says "stalker."** The skin shift changes labels (`SUBJECT` becomes `Nila`) and Nila says it once, near the end.

**World state machine**

| Trigger | What changes (no popup) |
|---|---|
| Start | Case skin. Tray shows `ADI-THINKPAD · DEV-7F3A`. Empty Board. Note on desktop. |
| **LOG strand** solved | Kiran pin appears on the Board with a taut string to the forwarding-rule pin. Note line 1 gets struck through. |
| **TIMELINE strand** solved | Kiran's label becomes `KIRAN?`. His string goes slack (sags, stays). Clock flickers once. |
| **AUDIO strand** solved | An `UNKNOWN` pin appears with a dashed string to Nila. Ambient hum drops a notch. |
| Any two strands | `evidence/photos/` unlocks (lock icon drops off in 4 steps). |
| Photos opened | `truth = 2`: hovering any pin shows its real description (the leak). Last note line appears: *owner of DEV-7F3A?* An `OWNER: ?` pin appears on the Board. |
| **OWNER** answered correctly | **The flip** (section 6). `truth = 3`. `last_recording.wav` appears. |
| Recording played to the end | `cases/closed_archive.txt` becomes the only active window. Opening it exposes the eight repeated theories as excuses; the ending buttons then appear. |

`truth` levels: 0 clean case skin; 1 after TIMELINE; 2 after photos; 3 after the flip.

**What the player believes, what changes it, and why they couldn't have known sooner**

| Stage | Player believes | Changed by | Why the earlier conclusion wasn't reasonable |
|---|---|---|---|
| Start | Nila is missing; Kiran is the suspect | The case file; `CASE_01` to `CASE_08` | The folders look like a long, diligent investigation |
| After LOG | Someone with access to her account, probably Kiran, is watching her | Forward rule, `DEV-19C2` login, Kiran's deactivation | All three lines fit Kiran; `DEV-7F3A` is just an ID |
| After TIMELINE | Not Kiran. Someone is using his number or is someone else | 22:10 Bengaluru post vs 22:40 "im downstairs" | `CASE_02` already closed Kiran for the same reason, but nothing forces the player to open it |
| After AUDIO | The watcher is someone she knows | "I know who it is" | Fits any acquaintance |
| After photos | One device appears in the log, the photos and the SIM | `DEV-7F3A` and `4471` repeated | The ID reads like an evidence tag, not a hostname; the tray text is small |
| OWNER | It's me | Token flash, tray, `sysinfo` | Everything needed was on screen from the start |
| After the recording | The investigation was a pretext, not a mistake | `CASE_01` to `CASE_08` relabel from "theory" to "excuse"; each was closed when she turned out fine | The player can reread the eight cases and see the pattern themselves |

The last row is the real reveal. "I was the stalker" is a culprit reveal. "Every case was a reason to keep looking" reinterprets the whole session. To prevent the strongest reveal from being skipped, the ending choice is gated on one archive action after the recording: the player opens `cases/closed_archive.txt`, which lists all eight prior cases with `theory:` relabelled as `excuse:`. This is not another puzzle; it is the required final context before the choice.

---

## 5. The puzzles (five interactions, five different verbs)

Every puzzle is solved by **pinning the right evidence to the Board.** Every app has a *Pin* action (button, or `pin <id>` in the terminal), and pinning is how the player forms their theory.

### P1. The log (terminal): *filter*

- **Data:** `logs/access.log`, about 1,200 generated routine lines sampled across active monitoring windows, almost all `sync ok ... dev=DEV-7F3A new=N`. Do not generate a full 15-minute record for every day; that would create roughly 4,300 routine lines and contradict the intended data volume. Preserve the listed event timestamps exactly.
- **Player does:** `cat` shows a wall of noise. `help` lists `grep -v`, `grep -c`, `head`, `tail`. Filtering routine `sync ok` lines leaves five anomaly lines plus the final `sync final` line (section 7.5). The player pins the lines that matter.
- **Solved when:** pinned `forward rule 8 Sep` **and** at least one of `DEV-19C2 login` / `Kiran deactivated`.
- **The trap:** the three lines make Kiran look guilty. The forward rule is `dev=DEV-7F3A`, which the player doesn't yet recognise.
- **Feedback:** `pin` prints `pinned.` and the card slides onto the Board.
- **Build cost:** low (grep flags are the only new engine work).

### P2. The night (Messages): *scrub*

- **UI:** a timeline rail for 12 Sep, 20:00 to 23:59, with a draggable playhead. As it passes a timestamp, that message types itself into the thread. Two threads interleave: Nila and Sana (mirrored), and texts from `…4471` to Nila. Three markers sit on the rail: 21:12, 21:14, and 22:10.
- **Player does:** drags through the night. At 22:10 a marker reads `KIRAN: posted from airport, Bengaluru` (a public post Adi saved). At 22:40, `4471: im downstairs`. Kiran's name never appears in Nila's or Sana's messages.
- **Solved when:** pinned the **22:10 Bengaluru marker** and **any 4471 message at or after 22:40**.
- **Insight:** Kiran can't be downstairs. Theory 1 breaks, Theory 2 ("someone else, maybe using Kiran's number") begins. `CASE_02` already closed Kiran for the same reason; a careful player notices they are repeating themselves.
- **Decoys:** 4471 messages before 21:14 look suspicious but fit Kiran, so they don't solve it.
- **Build cost:** medium. It's the most visible interaction after the Board, so budget properly.

### P3. The recording (Player): *tune*

- **UI:** one horizontal dial (0 to 100), an oscilloscope canvas, and a transcript panel full of scrambled glyphs.
- **Player does:** sweeps the dial. Near a fragment's centre, the waveform calms and text de-scrambles letter by letter. Hold within tolerance for one second to lock it. Three fragments at about 18, 52, and 81.
- **Solved when:** all three locked (they auto-pin).
- **Fragments:** see section 7.8. They imply Nila was afraid of someone she knew.
- **Feedback:** the scope's noise amplitude and the scramble are both driven by `distance(dial, nearestTarget)`, so there is no "wrong," only warmer and colder.
- **Build cost:** low to medium. One reusable `scrambleReveal()` function does the text.

### P4. The photos (Files): *inspect*

- Unlocks after any two strands. Six photos of her hostel taken from outside. Each has an **Inspect** tab: file, time, GPS (generic), `device: DEV-7F3A`, and on the last one `net: SIM2 ...4471`.
- **There's no solve condition.** Opening the folder moves `truth` to 2. This is where a sharp player first sees `DEV-7F3A` and `4471` and connects them to the log.

### P5. The owner (Board): *deduce*

- **Token linking (global mechanic):** any `DEV-…` or `…4471` in any app is clickable. Clicking it flashes **every other instance on screen** (log lines, photo metadata, the tray, the Board). That's how the player discovers one ID appears everywhere, and also in the tray at the bottom of their own screen.
- **UI:** a pin labelled `DEV-7F3A / OWNER: ____`. The player types a name.
- **Accepted:** `adi`, `me`, `myself`, `mine`, `i`, `you`, `this laptop`, `my laptop` (case-insensitive, trimmed).
- **Rejected with diegetic feedback:**
  - `kiran` → string snaps. *"Kiran's device is DEV-19C2."*
  - `unknown` / blank → *"That's what the note has said for five weeks."*
  - anything else → *"Not in the registry."*
- **Fair-play check:** the answer is findable via the tray, `sysinfo`, the log, the photo metadata, and token flashing. The player never has to guess a name nobody has seen. `sysinfo` prints `registered owner: Adi`.

---

## 6. The flip (the set piece)

This is the one moment worth spending an hour on. About 7 seconds, in this order:

1. **0.0s** The correct answer lands. 3-frame brightness dip. Ambient hum cuts to silence.
2. **0.3s** Strings detach from the pins one by one (stepped), swing, and re-attach to a **new central node, YOU.** The Nila node slides to the edge and shrinks. Everything now points at the middle.
3. **1.5s** **Slice glitch**: the whole desktop splits into six horizontal strips that displace sideways in steps for 400ms, then snap back.
4. **2.0s** **Skin swap:** every text with a `data-case` label scrambles and resolves into its `data-real` label (table in section 8.3). Stamps fade out. Amber turns grey. Window chrome goes flat. The cursor changes from a magnifier to a plain arrow.
5. **4.0s** Nothing moves for two seconds. Only room tone.
6. **6.0s** A new file icon, `last_recording.wav`, fades in on the desktop. The Notes window's to-do list is blank.

With `prefers-reduced-motion`, steps 2 and 3 become a single fade and the rest keeps its order.

---

## 7. All content (write into `src/content/` exactly as written)

Every content file stays under about 120 words, except the generated log and `cases/closed_archive.txt` (the archive intentionally collects the eight prior theories in one required final reveal).

### 7.1 Boot and desktop

Boot:

```
ADI-THINKPAD   DEV-7F3A      Thu 22 Oct 2026   23:52
last session ended 23:41  (unclean)
mirror.py: running
battery 23%     network: none
```

`READ_ME_FIRST.txt` (on the desktop):

```
CASE_09 / NILA / MISSING
last contact 23:41

The investigation failed. Start again.

Start with the access log.
Do not play last_recording.wav until the case is closed.
It will contaminate the timeline.

- A.
```

### 7.2 Cases folder

`~/cases/CASE_01` to `CASE_08`, one `closed.txt` each. Eight theories, one subject:

```
CASE_01  subject: NILA  theory: she was abducted
         closed 11 Sep  reason: she replied to a friend's message that afternoon
CASE_02  subject: NILA  theory: Kiran took her
         closed 15 Sep  reason: Kiran was in Bengaluru
CASE_03  subject: NILA  theory: her friends are covering for her
         closed 21 Sep  reason: they said they hadn't heard from her
CASE_04  subject: NILA  theory: her family made her leave
         closed 26 Sep  reason: her aunt's landline picked up. hung up.
CASE_05  subject: NILA  theory: her account was hacked, the messages aren't hers
         closed 1 Oct   reason: the messages sounded like her
CASE_06  subject: NILA  theory: someone is impersonating her
         closed 8 Oct   reason: nobody else has her passwords
CASE_07  subject: NILA  theory: her phone was lost, she can't contact anyone
         closed 14 Oct  reason: she bought a new SIM
CASE_08  subject: NILA  theory: she was erased from the college records
         closed 19 Oct  reason: the portal still lists her
```

(One file per folder, each with its own two lines.) `CASE_09` holds `evidence/`, `logs/`, and `notes/`. The archive lives at `~/cases/closed_archive.txt` in the virtual filesystem.

### 7.3 `cases/closed_archive.txt` (required final reveal)

This file becomes visible as the active window only after `last_recording.wav` has played to the end. It is not a new puzzle. Opening it updates the case labels and unlocks the ending buttons.

```
CASE_01  excuse: she was abducted
         closed 11 Sep  reason: she replied to a friend that afternoon
CASE_02  excuse: Kiran took her
         closed 15 Sep  reason: Kiran was in Bengaluru
CASE_03  excuse: her friends are covering for her
         closed 21 Sep  reason: they said they hadn't heard from her
CASE_04  excuse: her family made her leave
         closed 26 Sep  reason: her aunt's landline picked up. hung up.
CASE_05  excuse: her account was hacked, the messages aren't hers
         closed 1 Oct   reason: the messages sounded like her
CASE_06  excuse: someone is impersonating her
         closed 8 Oct   reason: nobody else has her passwords
CASE_07  excuse: her phone was lost, she can't contact anyone
         closed 14 Oct  reason: she bought a new SIM
CASE_08  excuse: she was erased from the college records
         closed 19 Oct  reason: the portal still lists her

Eight cases. One subject. No missing person.
```

### 7.4 `evidence/suspects.txt`

```
SUSPECT 1: KIRAN S.
  ex of subject. left college in Aug.
  device: DEV-19C2 (old lab laptop)
  phone: unknown (Adi mislabelled ...4471 as Kiran)
  motive: she ended it. he didn't accept it.

SUSPECT 2: none yet
```

(The motive line is Adi describing himself.)

### 7.5 `logs/access.log`

Generate about 1,200 routine lines sampled across active monitoring windows. Do not generate one line every 15 minutes continuously across the whole period; that would produce about 4,300 routine lines. Use deterministic timestamps and preserve the five anomaly lines and final sync below. Example routine line:

```
2026-09-13 00:11:02  sync ok  acct=nila  dev=DEV-7F3A  new=0
```

Insert exactly these five non-routine lines in chronological order:

```
2026-09-08 02:14:09  rule_created  acct=nila  type=forward  dev=DEV-7F3A
2026-09-08 02:14:51  login  acct=nila  dev=DEV-7F3A  method=saved_password
2026-09-12 21:12:30  login  acct=nila  dev=DEV-19C2  app=photos_shared
2026-09-12 21:14:02  acct_deactivated  user=kiran.s  source=college_portal
2026-09-14 02:50:33  phone_changed  acct=nila  note=old number removed
```

Last line of the file:

```
2026-10-22 23:41:07  sync final  acct=nila  dev=DEV-7F3A  new=2
```

### 7.6 The night of 12 Sep (Messages)

Mirrored chat, Nila and Sana (Kiran is never named):

```
20:41 Sana: u ok? u went quiet
20:43 Nila: he's been texting since morning
20:44 Sana: who??
20:44 Nila: can't say
22:38 Sana: it's him isn't it
22:38 Nila: i can't say
22:44 Sana: Nila. who
22:45 Nila: i can't say. he keeps turning up
```

Texts to Nila from `…4471`:

```
20:55 4471: you've been quiet today
21:02 4471: saw you at the library. nice jacket
22:40 4471: im downstairs
22:41 4471: come down. just 5 min
22:52 4471: ok. ill wait
23:30 4471: still here
```

Rail markers: `21:12 login DEV-19C2`, `21:14 kiran.s deactivated`, `22:10 KIRAN: posted from airport, Bengaluru`.

### 7.7 Photos (`evidence/photos/`)

Six photos with the same fields. The first and last, as examples:

```
file:    IMG_0911_1752.jpg
taken:   2026-09-11 17:52
device:  DEV-7F3A
place:   campus road, opposite block C
subject: third-floor window

file:    IMG_0912_2236.jpg
taken:   2026-09-12 22:36
device:  DEV-7F3A
net:     SIM2 ...4471
place:   campus road, opposite block C
subject: third-floor window, light on
```

### 7.8 Recording fragments (`rec_0912_2236.wav`, tuned from static)

```
Fragment 1 (dial ~18)
...he's outside again. I can see the light of a phone.

Fragment 2 (dial ~52)
...I'm recording this for the warden. 12 September. 10:36 pm. Third time this week.

Fragment 3 (dial ~81)
...I'm not going down. I know who it is.
```

### 7.9 Adi's to-do (`notes/todo.txt`, struck through as the Board changes)

```
- filter the access log. routine lines are noise
- cross-check the 12 Sep thread against where Kiran was
- recording: sweep the dial slowly
- photos: check the metadata
- owner of DEV-7F3A?          (appears after the photos)
```

### 7.10 `sysinfo`

```
host:               ADI-THINKPAD
registered owner:   Adi
device group:       DEV-7F3A  (this laptop + paired handset)
phone-link:         paired, SIM2 ending 4471
processes:          mirror.py  (running since 08 Sep 02:14)
```

### 7.11 Nila's last recording (`last_recording.wav`)

Plays as text at speaking pace over room tone. If you can, have a friend record it on a phone (about 35 seconds); a real voice will carry the ending far better than any synthesised one.

```
[room tone. a door somewhere]

It's me. I know you'll hear this on the laptop,
because you read everything I put in this account.

I'm not missing. I'm at my aunt's.
I changed my number because you wouldn't stop.

You promised me on the second that you'd stop.
I believed you for about a day.

I'm not going to tell you where I am. I think you know.
Please don't come.

Close it. Delete it. That's all I want.
```

### 7.12 Endings

**CLOSE CASE** (confirmation: `This will delete 41 local case/mirror files and stop mirror.py. This cannot undo the access that already happened. [Delete] [Cancel]`):

```
removed 41 files.
mirror.py stopped.
nothing new will arrive.
```

The desktop dissolves into a plain default wallpaper with one empty folder. This only stops ongoing collection; it does not repair the harm or imply forgiveness. Cut to black, then:

```
last session ended 00:07  (clean)

DEAD PIXELS
```

**OPEN CASE_10:** the Board wipes. The system creates `CASE_10/`, copies the case template, and prints one line in the same plain voice as everything else:

```
NEW CASE INITIALIZED.
```

The case skin returns, `READ_ME_FIRST.txt` reappears with a fresh timestamp, and the boot line reads `mirror.py: running`. The game ends there. No sting, no warning. The procedural response is the point: the system is ready to help him continue.

The game never rewards either choice. It only shows what each one costs. The ending buttons cannot appear until the player opens the prior-case archive after the recording, ensuring the repeated-excuse reveal is seen before the decision.

---

## 8. Visual design (anti-slop, with a reason for every rule)

### 8.1 Two skins, one laptop

The case skin looks **home-made on purpose**: Adi built his own case-file template. Cream paper panels, mismatched typewriter caps, amber rubber-stamp boxes (`CONFIDENTIAL`, `EXHIBIT 4`), a badly-drawn badge logo. It's plausible, slightly off, and the flip strips it away. Underneath is a plain grey student-laptop desktop with flat bevelled chrome.

### 8.2 Rules

**Never:** gradients, glow, neon, glassmorphism, drop-shadow cards, rounded corners, purple/cyan palettes, Inter/Space Grotesk, emoji, achievement popups, tutorial tooltips, synthwave.

**Always:** 1px bevelled chrome, one pixel/bitmap mono family throughout (Departure Mono or Terminus; check the licence), a taskbar tray with `ADI-THINKPAD · DEV-7F3A`, a ticking clock, battery at 23%, a no-network icon. A messy desktop. Feedback by changing the world.

```css
:root{
  --desk:#3d4a44; --chrome:#c4c4bb; --title:#2a2f33; --paper:#e8e6dc;
  --term-bg:#101312; --term-fg:#b8c4b0;
  --amber:#d9a441;   /* case skin accent, unread only; vanishes at truth 3 */
  --red:#b3382c;     /* deletion confirm only */
}
body[data-truth="3"]{ --amber:#8d8d86; }
```

### 8.3 Case label to real label (swapped at truth 2 on hover and fully at truth 3)

| `data-case` | `data-real` |
|---|---|
| SUBJECT: NILA | Nila |
| STATUS: MISSING | not missing |
| LAST CONTACT 23:41 | last sync 23:41 |
| EXHIBIT 4: SURVEILLANCE PHOTO | photo you took, 11 Sep 17:52 |
| SUSPECT: KIRAN? | Kiran (Bengaluru) |
| UNKNOWN DEVICE | your laptop |
| INTERCEPTED MESSAGES | Nila's messages, mirrored from her account |
| EVIDENCE VIEWER | Photos |
| CASE_09 | Nila, ninth theory |
| theory: (in CASE_01 to CASE_08) | excuse: |

The lint test fails if any `data-case` has no `data-real`.

### 8.4 Photos

Take 6 real campus photos, run `scripts/dither.py` (160×120, 4 colours, Floyd–Steinberg), and display with `image-rendering: pixelated`. If you skip this, show a flat grey frame with the metadata only. Don't generate images.

### 8.5 Cursor

Magnifier in the case skin, plain arrow after the flip. Cheap and it tells the story.

---

## 9. Animation, transitions, and sound — final implementation decision

### The decision

**Do not install Phaser, PixiJS, PixiJS Filters, GSAP, Motion, or Proton for this build.** DEAD PIXELS is an interactive operating-system mystery, not a character-based platformer. Most of its interaction happens in windows, terminal output, messages, metadata, and the evidence Board. A full renderer or particle system would add integration work without improving the central story mechanic.

Use the existing stack:
- **DOM + CSS** for desktop windows, terminal, taskbar, messages, file explorer, notes, and labels.
- **SVG** for the evidence Board, pins, strings, sagging connections, and token links. SVG keeps the Board crisp and makes individual strings easy to animate.
- **Canvas 2D** for the pixel dissolve and oscilloscope only. Do not render the entire game to Canvas.
- **CSS keyframes and a tiny TypeScript effects module** for stepped glitches, window movement, text scrambling, cursor changes, and the skin swap.
- **Web Audio API** for synthesized fan hum, clicks, and scope noise. A real recorded voice is strongly preferred for Nila's final recording; if unavailable, show the transcript at speaking pace over room tone.
- **No runtime animation dependency.** Use a single shared `fx` module so timing, reduced-motion behavior, and cleanup are consistent.

This is the final library choice. Do not revisit it during the hackathon unless the core game is already complete and tested.

### Motion rules

Use stepped timing (`steps()` and short frame sequences) for the case-file aesthetic. Avoid smooth, decorative movement. Motion should communicate a state change or provide feedback. Keep all animation short and interruptible.

| Effect | Where | Implementation | Priority |
|---|---|---|---|
| Boot POST text, typewriter, block cursor | boot | CSS + small JS | P0 |
| Desktop pixel reveal | after boot | Canvas mask in 8 stepped passes; fade fallback | P1 |
| Window open/close and focus | all apps | CSS 4-step scale/translate; title-bar flash | P0 |
| Text scramble/reveal | tuner, skin flip, redacted text | reusable `scrambleReveal(el, target, progress)` | P0 |
| Global token flash | every app and taskbar | `data-tok` registry; flash every visible match for 600ms | P0 |
| Timeline scrubber | Messages | deterministic timestamp-to-message reveal; keyboard-operable playhead | P0 |
| Oscilloscope | Player | Canvas waveform/noise tied to dial distance | P1 |
| Evidence strings and sag | Board | SVG quadratic curves; animate tension change in 4 steps | P0 |
| Pins land on Board | Board | 4-step translate; subtle paper/card shift | P0 |
| Photo-folder lock drops | Files | 4-step translate/fade | P1 |
| To-do strike-through | Notes | stepped width wipe | P1 |
| The flip | Board and desktop | follow section 6 in exact order | P0 |
| Cursor swap | global | CSS cursor changes with `data-truth` | P1 |
| Ending dissolve | ending | Canvas mask if time; otherwise plain fade | P2 |
| Rain on boot | boot | optional small Canvas loop | P2 |
| Dead amber pixel | global | one fixed div | P2 |

P0 means essential to the story or usability. P1 improves presentation after the game works. P2 is cut first. **Do not add particles, camera shake, bloom, glow, CRT filters, chromatic aberration, or generic glitch overlays.** They fight the restrained visual language and do not support the narrative.

### The flip

The flip is not a general-purpose screen transition. It is a one-off narrative event, and its exact sequence is defined in section 6. Implement it as a state-driven sequence with named steps and cleanup, not as a collection of unrelated timers. It must be safe if the player has reduced motion enabled or triggers a reset during testing.

### Interactivity and input requirements

- Windows can be dragged by their title bars, focused, minimized, and restored from the taskbar. Keep the layout usable at 1280×720.
- Terminal supports command history with Up/Down, Enter to run, and a visible caret. Unknown commands return an in-world response and never crash the app.
- The timeline playhead works with mouse and keyboard. Moving backward does not erase messages already revealed; the revealed count is monotonic.
- Every pin action is available by mouse and, where applicable, a terminal command. Do not make drag-and-drop the only way to solve a puzzle.
- Clickable evidence tokens have a visible hover/focus treatment and flash all visible matches. Token flash must not depend on a window being active.
- The owner field supports Enter, has a clear focus state, and does not require a mouse.
- The ending choice cannot appear until the archive has been opened after the final recording.
- `prefers-reduced-motion: reduce` replaces stepped movement, dissolve, and glitch with brief fades or immediate state changes. It must not skip story content or change puzzle logic.
- Audio is enhancement, never a gate. If Web Audio is blocked or muted, all puzzles and endings remain playable. Start audio only after a user gesture; include a mute toggle in the taskbar.

### Sound design

Use a restrained sound palette: low fan hum, soft key ticks, a quiet pin click, and scope noise that calms as the dial approaches a fragment. The hum drops slightly as strands are solved. At the flip, cut all sound for two seconds. The final recording uses room tone only. Avoid music, stingers, jump scares, or a triumphant sound for either ending.

## 10. Tech stack — locked

| Layer | Final choice | Reason |
|---|---|---|
| Build | Vite | Fast local development and static output |
| Language | TypeScript | State and puzzle rules are easier to verify |
| Interface | Vanilla DOM + CSS | The fiction is a desktop operating system; windows and text should remain real, selectable DOM |
| Evidence Board | SVG | Individual pins and strings need stable IDs and direct interaction |
| Canvas | Canvas 2D, limited to two effects | Scope waveform and optional pixel dissolve; not the main renderer |
| Animation | CSS + a small TypeScript `fx` module | No dependency overhead; all effects can be centrally disabled for reduced motion |
| Audio | Web Audio API + optional recorded voice | No external audio engine; gracefully degrades when blocked |
| State | In-memory store mirrored to `localStorage` in `try/catch` | Refresh persistence without a backend |
| Unit tests | Vitest | Fast tests for content, virtual filesystem, and puzzle rules |
| Browser tests | Playwright | Verify the actual player journey and interactions |
| Hosting | Static build (Netlify/Vercel/GitHub Pages) plus offline local copy | No server required |

**Dependencies:** keep the production dependency list minimal. Do not add a general-purpose game engine or animation/particle library. The game's interaction model is already implemented with DOM, SVG, and Canvas; adding Phaser or PixiJS would mean introducing a second rendering architecture. GSAP/Motion/Proton are also unnecessary for the fixed, short effects specified here.

**Visual assets:** use the project's own metadata-driven frames and restrained CSS/SVG. Do not spend time finding or integrating sprite packs. If real campus photographs are not available or appropriate to use, use metadata-only grey frames; do not invent photographs of a real person.

No backend, database, analytics, remote font, remote image, or AI API. The game must work offline after the static files have loaded.


### Repo structure

```
dead-pixels/
├─ PLAN.md   DEAD_PIXELS_BIBLE_v4.md   README.md (with content note)
├─ src/
│  ├─ content/       filesystem.ts  messages.ts  log.ts  photos.ts  recordings.ts  skin.ts  endings.ts
│  ├─ engine/
│  │  ├─ vfs.ts        tree, cwd, hidden files, locks
│  │  ├─ commands.ts   help ls cd pwd cat grep(-v -c -i -r) head tail wc pin sysinfo ps
│  │  ├─ state.ts      pins, strands, truth, owner, ending, events
│  │  ├─ strands.ts    solve rules from section 5
│  │  ├─ tokens.ts     token registry + matches
│  │  └─ owner.ts      accept/reject list + feedback lines
│  ├─ ui/
│  │  ├─ boot.ts  windowManager.ts  taskbar.ts  fx/ (scramble.ts flash.ts glitch.ts dissolve.ts)
│  │  └─ apps/  terminal.ts messages.ts player.ts files.ts notes.ts board.ts
│  ├─ audio/ synth.ts
│  ├─ styles/ theme.css skin-case.css skin-truth.css windows.css
│  └─ main.ts
├─ tests/  content.test.ts  engine.test.ts  strands.test.ts  playthrough.test.ts  e2e/*.spec.ts
└─ scripts/ dither.py  gen-log.ts
```

### Core types

```ts
type Pin = { id: string; source: 'log'|'msg'|'src'|'aud'|'photo'; text: string; real?: string };
type State = {
  pins: Set<string>;
  strands: { log: boolean; timeline: boolean; audio: boolean };
  photosOpened: boolean;
  truth: 0|1|2|3;
  ownerSolved: boolean;
  recordingDone: boolean;
  ending: null|'close'|'open10';
};
```

Strand rules, owner rules and the truth transitions live in `engine/` with no DOM code, so the entire game is playable headlessly by tests.

---

## 11. Test plan and gates

Each stage is done only when its gate is green. Tag each (`git tag stage-N`).

| # | Stage | Time | Gate |
|---|---|---|---|
| 0 | Scaffold, PLAN.md | 10 min | build and test run clean |
| 1 | Content: copy section 7 verbatim, generate the log and archive | 30 min | **Content lint** green; you read it aloud once |
| 2 | Engine: vfs, commands, tokens | 60 min | unit tests: `grep -v "sync ok"` leaves exactly five anomaly lines plus the final `sync final` line; `grep -c`; `pin` dedupes; locked paths refuse `cat` |
| 3 | State, strands, truth, owner | 35 min | **Headless playthrough** (below) reaches both endings; photos stay locked with <2 strands; owner accept/reject lists correct; recording locked until owner solved |
| 4 | Terminal UI | 35 min | Playwright: type, history, pin lands on Board, unknown command doesn't crash |
| 5 | Shell, theme, tray, token flash | 60 min | window drag/focus works; clicking `DEV-7F3A` flashes ≥3 elements across apps |
| 6 | Messages scrubber | 35 min | revealed count is monotonic as the playhead moves; pinning the 22:10 marker + 22:40 message solves TIMELINE |
| 7 | Audio dial | 30 min | each fragment locks only within tolerance and after the hold; all three auto-pin |
| 8 | Files, photos, Inspect | 20 min | photos locked until two strands; opening sets `truth=2` |
| 9 | Board, flip, endings | 70 min | wrong owners return the right feedback; correct owner sets `data-truth="3"`, stamps removed, `last_recording` present; both endings reachable from a fresh load |
| 10 | Effects, sound | 40 min | full suite green with audio blocked and with reduced motion |
| 11 | Demo hardening | 35 min | checklist in section 13 |

**Content lint:** every `data-case` has a `data-real`; "Kiran" appears in no message by Nila or Sana; every `CASE_01` to `CASE_08` file has a `theory:` and a `reason:`; `DEV-7F3A` and `4471` each appear in ≥3 separate sources; every pinnable ID exists; every content file under 120 words (log and `cases/closed_archive.txt` excepted); the five anomaly lines exist in the generated log in order; the final line is `sync final` and survives the routine-line filter; all timestamps are sorted; the archive lists all eight cases and maps `theory:` to `excuse:`; no content mentions a path that isn't in the tree.

**Golden-path headless script:**

```
terminal: grep -v "sync ok" logs/access.log
pin log:rule_created_0908
pin log:deactivated_kiran            -> LOG strand solved
messages: scrubTo(22:41)
pin src:kiran_airport_2210
pin msg:4471_2240                    -> TIMELINE strand solved; photos unlock
files: openPhotos()                  -> truth = 2
board: setOwner("kiran")             -> rejected
board: setOwner("adi")               -> truth = 3, flip
player: play last_recording
player: wait for the recording to finish
archive: open cases/closed_archive.txt -> ending choice unlocked
board: choose close | open10
```

Separate tests cover order independence (all six orderings of the three strands) and the AUDIO strand being solvable last.

---

## 12. Schedule

| Stage | Min |
|---|---|
| 0 to 3 (scaffold, content, engine, state) | 135 |
| 4 to 5 (terminal UI, shell, tokens) | 95 |
| 6 to 8 (messages, audio, files) | 85 |
| 9 (board, flip, archive gate, endings) | 75 |
| 10 to 11 (effects, hardening) | 75 |
| **Total** | **465 min ≈ 7.75 hrs** |

That leaves about 15 minutes of buffer, which is thin. **Decide the cut order before you start:**

1. Rain on the boot screen
2. The audio dial (replace with the `play` command revealing fragments on a timer; P3 becomes weaker but the game still works)
3. Photo dithering (metadata only)
4. Optional dead pixel, ending dissolve (use a fade)

Never cut: token flash, the scrubber, the Board, the flip, the to-do note, the archive reveal, the ending.

---

## 13. Demo hardening and judge script

- Run the exact demo laptop and browser; 1280×720.
- Play it through three times, once from a cleared state.
- `?reset` wipes progress. `?solve=log,timeline` pre-solves strands so you can start mid-game.
- Deploy a static build and keep an offline copy. Record a 60-second fallback video.

**Judge script (about 6 minutes):**
1. 30 sec: "You're an investigator. Your case file says Nila is missing."
2. 90 sec: solve the log live, show `grep -v`, pin two lines, the Board reacts.
3. 90 sec: scrub the night, point at 22:10 and 22:40, the string goes slack.
4. 30 sec: tune the recording, the text de-scrambles.
5. 90 sec: photos, click `DEV-7F3A`, it flashes on your own taskbar. Type the answer. **The flip.**
6. 30 sec: play Nila's recording, open the prior-case archive, show eight theories relabelled as excuses, then present the choice.

---

## 14. Agent setup and Stage 0 gate

### Installed project skills

The project is expected to contain these Antigravity-compatible skills under `.agents/skills/` when installed:

- `.agents/skills/frontend-design/SKILL.md` — use its guidance to create a distinctive visual direction grounded in DEAD PIXELS, plan palette/type/layout before implementation, avoid generic template styling, and review accessibility, keyboard focus, responsiveness, and reduced motion.
- `.agents/skills/webapp-testing/SKILL.md` — use its Playwright-based workflow for browser inspection and functional testing. If using its bundled `scripts/with_server.py`, run `python scripts/with_server.py --help` before using it.
- Superpowers skills, if installed — use the relevant test-driven-development, systematic-debugging, and verification-before-completion workflows. Do not assume a skill is installed unless its files are present and readable.

At the beginning of work, inspect the workspace and available skills. Skill instructions support this Bible; they do not override its story, constraints, stack, priorities, or acceptance criteria. Do not install additional dependencies or skills without asking first. The Bible is the source of truth.

### Stage 0: inspect, plan, and scaffold only

Stage 0 is a mandatory approval gate. Do not implement puzzles, story progression, evidence interactions, or final visuals in this stage.

Acceptance criteria:
1. Inspect the current workspace and report existing files that may be affected; do not overwrite user work blindly.
2. Read this complete Bible and create `PLAN.md`, mapping each development stage to its requirements, dependencies, and acceptance criteria.
3. Scaffold Vite + TypeScript with vanilla DOM/CSS. Keep the architecture compatible with SVG for the evidence Board and limited Canvas 2D effects. Do not add Phaser, PixiJS, GSAP, Motion, Proton, or other unapproved dependencies.
4. Establish a minimal application shell and project structure only. No implemented puzzles or invented story content.
5. Identify the development, build, and test commands. Run the available checks and report the actual output; do not claim a check passed unless it was executed.
6. Inspect the installed project skills and follow relevant guidance. Preserve the Bible as the source of truth.
7. Report files created/modified, commands run, results, and deviations. Then stop and wait for explicit approval before Stage 1.

**Stage 0 prompt (copy into Antigravity):**

> Read the complete `DEAD_PIXELS_Build_Bible_v4.md` before doing anything. Inspect the current workspace and the available project skills, especially `.agents/skills/frontend-design/SKILL.md` and `.agents/skills/webapp-testing/SKILL.md`; use their relevant instructions without allowing them to override this Bible. Use relevant installed Superpowers workflows if available.
>
> This is Stage 0 only. Do not implement gameplay or puzzles.
>
> 1. Inspect the workspace and report existing files that could be affected. Do not overwrite existing user work blindly.
> 2. Create `PLAN.md` mapping every development stage to requirements and acceptance criteria from this Bible.
> 3. Scaffold Vite + TypeScript using vanilla DOM/CSS, with a structure suitable for an SVG evidence Board and limited Canvas 2D effects.
> 4. Do not install or use Phaser, PixiJS, GSAP, Motion, Proton, or unapproved dependencies.
> 5. Create only the smallest application shell needed to verify the scaffold. Do not implement puzzles, story progression, or invented content.
> 6. Identify the build, test, and development commands. Run available checks and report their actual output.
> 7. Report created/modified files, commands run, check results, and any deviations from the Bible.
> 8. Stop after Stage 0 and wait for my explicit approval before proceeding.

## 14. Antigravity prompts

**Master prompt (once):**

> You are building DEAD PIXELS following `DEAD_PIXELS_Build_Bible_v4.md` and `PLAN.md`. This Bible is the source of truth. Inspect and follow relevant installed skills in `.agents/skills/`, especially `frontend-design` and `webapp-testing`, and use relevant Superpowers workflows if available; skills never override this Bible. Work one stage at a time. Stage 0 is inspect/plan/scaffold only and requires my approval before Stage 1. For each later stage: implement it, write the tests listed for it in section 11, run them, and fix failures. Do not start the next stage until all tests pass and I approve. Do not add features, apps, libraries or animations not in the Bible, and do not install additional dependencies without asking. Do not use Phaser, PixiJS, GSAP, Motion, Proton, or a filter pack. Use DOM + CSS, SVG for the Board, and Canvas 2D only for the scope and optional dissolve. All story text lives in `src/content/` and must be copied verbatim from section 7; do not rewrite, improve or add text. `src/engine/` must contain no DOM code. Follow section 8's visual rules exactly; if unsure whether something looks generic, choose the plainer option. Follow section 9's P0/P1/P2 priorities; all motion uses stepped timing and must support reduced motion. After each stage update `PLAN.md`, report test results based on commands actually executed, and commit only if Git is configured and the change is appropriate.

**Per-stage prompts (examples):**

- *Stage 0:* Use the full Stage 0 prompt in section 14. Do not implement gameplay; stop and wait for approval.
- *Stage 1:* "Do Stage 1. Copy section 7 into `src/content/` verbatim. Write `scripts/gen-log.ts` to generate the routine lines and insert the five anomaly lines in order. Then write and run the content lint."
- *Stage 5:* "Do Stage 5. Build the window manager, taskbar tray and the global token-flash mechanic from section 9. Use only the palette in section 8. Screenshot at 1280×720 and show me before continuing."
- *Stage 9:* "Do Stage 9. Build the Board and the flip exactly as section 6 specifies, step by step and in that order. Provide a `?solve=log,timeline,audio` shortcut for testing. Record a screen capture of the flip."

Run each stage's tests yourself before moving on. Agents sometimes report green without running them.
