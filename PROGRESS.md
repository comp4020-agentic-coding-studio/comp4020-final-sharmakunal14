# Maze Duel progress

This is the dated implementation log. Record what was done, why it changed,
the relevant commits, what was actually checked and what remains unresolved.
Keep important design reasoning in [the design notes](docs/design.md) and
[decision records](docs/decisions/0002-maze-duel-first-playable.md).

Entries distinguish completed work from proposed next steps. This log supports
the author's later `PROCESS.md`; it does not replace the assessed reflection.
Never include credentials, cookies or sensitive player data in either record.

## 2026-11-01 — First playable version

### Starting point and outcome

The final-project repository contained Shared Space, with Node, SQLite, SSE
and 15 existing checks. The agreed first Maze Duel milestone was a two-player
lobby, shared countdown, one verified maze, live movement and a server-decided
winner. Work was implemented on `codex/maze-duel-first-playable` in 19 focused
commits, from `ca89fdd` through `9f1a49f`.

The local prototype now supports a complete race from invitation to saved
result. It includes keyboard and directional-button controls, reconnect
snapshots and explicit server-restart handling. Earlier routes, data, tests
and writing were retained. No new runtime dependencies were added.

### Work and commit evidence

These references identify local commits. They were not pushed during this
milestone, so the GitHub links may not resolve until those commits are published.

| Work completed | Commit evidence |
| --- | --- |
| Verified fixed maze, movement rules, countdown and single-winner logic. | [`ca89fdd`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/ca89fdd) |
| Added transactional SQLite match storage. | [`714e77c`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/714e77c) |
| Added authenticated lobbies, membership checks and validated HTTP commands. | [`d59394a`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/d59394a) |
| Recorded race invariants and scope in `CLAUDE.md`. | [`6965e81`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/6965e81) |
| Added SSE snapshots and checked simultaneous finishes. | [`3a6beb1`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/3a6beb1) |
| Built the responsive lobby/arena and projected maze renderer. | [`bcf678c`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/bcf678c), [`b359986`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/b359986) |
| Connected nicknames, invitation links and recent races. | [`3713a1a`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/3713a1a) |
| Added live readiness, timing, outcomes and bounded keyboard/button controls. | [`b237a67`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/b237a67), [`a35efd3`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/a35efd3) |
| Made Maze Duel the home page while retaining Shared Space navigation. | [`b5a5b55`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/b5a5b55) |
| Corrected phone layout and overlapping markers; added both lessons to the harness. | [`66194c4`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/66194c4), [`f073cdb`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/f073cdb) |
| Fixed documentation serving with explicit static-file boundaries. | [`99b9b4b`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/99b9b4b) |
| Added real-process restart, input-safety and completed-result persistence checks. | [`f7533be`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/f7533be), [`0ca850a`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/0ca850a), [`b20005b`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/b20005b) |
| Added factual play/run instructions and preserved the earlier README. | [`14fe7cd`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/14fe7cd) |
| Recorded implementation decisions and verification limits. | [`9f1a49f`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/9f1a49f) |

The reasons for retaining the runtime, choosing projected rendering, saving
snapshots and interrupting races on server restart are in
[decision 0002](docs/decisions/0002-maze-duel-first-playable.md).

### Corrections discovered during implementation

The first phone layout placed large player cards between the maze and its
controls. At 390×844, that made the active race awkward to operate. The compact
layout keeps the full board and controls together. Another browser observation
showed one marker obscuring the other when both occupied a cell. Visual offsets
now distinguish them without changing their authoritative positions. Both
corrections were carried into `CLAUDE.md`, not just left as one-off UI fixes.

### Verification actually performed

| Check | Recorded result |
| --- | --- |
| Baseline `pnpm check` | TypeScript and all 15 existing tests passed before implementation. |
| Final `pnpm check` against the local app | TypeScript passed; 32 tests passed across eight files, including all retained checks. |
| `pnpm check:evidence` | Passed: existing crit 8/9 reflections were found and all ten historical commit citations resolved. |
| Browser JavaScript syntax | `node --check` passed for all five new browser modules. |
| Patch whitespace | `git diff --check` passed. |
| Two-session browser race | Separate Chrome and in-app-browser cookie stores joined one race, readied up, saw the countdown and the same winner. A movement-button press, keyboard navigation, full finish and result reload were exercised. |
| Responsive inspection | Active-race layouts inspected at 1920×1080 and 390×844; viewport emulation, not a physical phone. |
| Inspected Chrome console | No errors or warnings reported in that session. |
| Actual process restart | Automated check confirmed both sessions retained access and an active race became interrupted without a winner. |
| Completed-result recovery | Automated database-reopening check preserved the winner and saved state. |

The browser observations were agent-driven development checks, not independent
human playtests. Their raw interactive transcript and screenshot are not
committed test fixtures. The evidence check validates structure and commit
references; it does not prove that the historical `PROCESS.md` describes this
new game. The original check results above were recorded during implementation,
not rerun merely to write this log.

### Outstanding at the end of this milestone

- No push or deployment was performed. Docker and TruffleHog were unavailable,
  so the container build and CI secret scans were not run locally.
- Independent playtesting, physical-phone use, sustained contention and slow
  deployed connections remain unverified. Navigation fairness and replay value
  are hypotheses, not established outcomes.
- The renderer is projected Canvas 2D. First-person/free-camera 3D, shared
  switches, procedural mazes, rankings and animated replays are deferred.
- The author still needs to revise the assessed README argument and
  `PROCESS.md` for Maze Duel, plus the research note if enrolled in COMP8020.

### Proposed next work

Have two people try the invitation and race from the URL alone. Record where
they get stuck before choosing another mechanic. Run the container and CI
checks when the required tooling is available, then verify deployment and
persistence on the hosted app. These are outstanding items, not completed work
or an instruction to deploy automatically.

## 2026-11-01 — Documentation workflow

After the initial implementation, the user requested ongoing design and progress
records. Added `docs/design.md` as the current design overview and this file as
the dated log. Separated detailed verification from the existing decision
record and linked it here. Added a harness rule requiring future work to update
these records as it happens. No application behaviour changed in this step.

Documentation validation passed: five documents checked for trailing whitespace,
12 local links resolved and all 19 initial implementation commit references
resolved locally. `pnpm check:evidence` and `git diff --check` also passed.
Application tests were not rerun for these documentation-only changes.

## 2026-11-01 — Milestone 2: shared maze mechanics (deployed)

### Why

An audit of the first playable version found four problems: one fixed maze
that could be memorised in one race, no interaction between players, speed
capped by each player's round trip, and persistence that showed a status
only. Scope and alternatives are in
[decision 0003](docs/decisions/0003-shared-maze-mechanics.md).

### Work and commit evidence

All of this is on branch `codex/maze-duel-first-playable`, pushed with this
entry. It is not merged to `main`.

| Work completed | Commit |
| --- | --- |
| Harness rules and decision record written **before** code. | [`95fb936`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/95fb936) |
| Daily seeded symmetric maze, switch-linked gates, banked-step speed rule. | [`790c9ea`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/790c9ea) |
| Step log, results table, best times, replay endpoint. | [`7bac9a4`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/7bac9a4) |
| HTTP checks: 300 ms batching, switch refusals, best times, replay privacy. | [`792166e`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/792166e) |
| Client prediction and batched sending. | [`e5231c7`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/e5231c7) |
| Switch/gate drawing and on-board key. | [`0506878`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/0506878) |
| Best-times panel and replay view. | [`a1c596a`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/a1c596a) |

### Corrections during the work

- **The generator broke symmetry.** The first version skipped a wall's
  mirrored partner whenever opening it would create a loop. Of 400 seeds,
  86 were asymmetric and 180 had no usable switch pair. The fix always opens
  the partner (a loop is fine) and retries deterministically on the same seed
  stream. Caught by a throwaway 400-seed script, then made permanent as the
  200-seed sweep in `spec/maze-game.test.ts`.
- **The sweep test was too slow.** Its first version ran a full search from
  every cell, every switch state and every seed, and timed out after 5 s. It
  now runs one flood fill per goal; a two-way grid makes that equivalent.
- **Sequence numbers could be reused.** An early client sender could reuse a
  sequence number if input was cleared while a request was in flight. The
  sender now numbers from the highest sequence issued, and
  `spec/maze-controls.test.ts` checks it ("never reuses a sequence number").
- **Layout fixes from the browser run.**
  - On the phone, the best-times list pushed the board down during a race; it
    is now hidden in a race.
  - Switches and open gates looked alike, so switches became diamonds and a
    key was added.
  - The replay page showed a stale "Maze preview" label.

### Verification actually performed

| Check | Result |
| --- | --- |
| `pnpm check` against the local app (Node 24.21) | Typecheck passed; 45 tests passed across 8 files. |
| Fail-first discipline | **Not followed this milestone.** Tests were written with or after the code. The only failures seen were the sweep timeout and a store test still expecting the old 13×13 positions. The HTTP milestone checks passed on first run, so none was observed failing against the old behaviour. `CLAUDE.md` asks for fail-first; this is a gap to note honestly. |
| Agent-driven Chrome run, two isolated profiles (1920×1080 and 390×844 emulated) | Join by link, ready, countdown, A walks to the switch and flips it, B's state shows the flip. No page errors; the 401s are the expected anonymous `/api/me` checks. |
| Simulated latency (Chrome DevTools network emulation, A only) | 56-step route: 8.7 s race time at 300 ms latency vs 8.2 s at 0 ms, about 149 ms per step in both. The old one-in-flight design would have needed about 17 s. |
| Replay | Opened from the finished race on the phone profile; scrubbing shows positions and explored cells. |
| Deployed to Fly by hand (`flyctl deploy`) from the branch | Live site 200; `/api/maze/today` serves the 2026-11-01 layout; the same two-browser script and a full finish plus replay passed against production. |
| Persistence on Fly | Today's best-times list was identical before and after `flyctl machine restart`. |

These were agent-driven checks with emulated viewports and emulated latency,
not human playtests on real phones or real slow networks.

### Outstanding

- No human has played milestone 2 yet. Whether switches create real decisions
  ("help myself or block them?") is a hypothesis.
- With symmetric switches, each player's own switch is nearer them. Does that
  make flipping always correct, or does closing the other gate ever hurt you?
  Needs playtesting.
- `main` still holds Shared Space; the branch needs merging for CI to deploy
  on push. Until then a CI deploy from `main` would overwrite this manual
  deploy.
- There is no retention policy for `maze_steps`.
- The author still needs to write the README argument, PROCESS.md, and the
  research note if enrolled in COMP8020. Raw material is in
  [docs/writing-notes.md](docs/writing-notes.md).

## 2026-11-01 — Milestone 3: real 3D view and interface rebuild

### Why

The author asked for a maze that feels genuinely 3D: walled corridors, a
character to follow, a vibrant setting, first- and third-person views, and a
more coherent modern "gamer" interface. They supplied a reference screenshot
of a 3D labyrinth app. Scope and alternatives are in
[decision 0004](docs/decisions/0004-three-dimensional-view.md). The
ui-ux-pro-max design-system search recommended "3D & Hyperrealism" for
gaming, with Russo One / Chakra Petch type and neon-on-dark accents.

### Work and commit evidence

| Work | Commit |
| --- | --- |
| Harness rules and decision 0004 written before the code. This commit also, unintentionally, contains the deletion of the old `maze.css` and `maze-layout.css`, which `git rm` had staged early. | [`f9c6d5c`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/f9c6d5c) |
| Vendored Three.js r170, served gzipped and immutable. | [`3b0a849`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/3b0a849) |
| 3D renderer: desert scene, brick walls, energy gates, crystal switches, avatars, map/3rd/1st cameras, turn-to-walk controls, 2D fallback. | [`d77f9ea`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/d77f9ea) |
| Glass HUD interface over the 3D stage. | [`5bb5f1b`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/5bb5f1b) |
| Check that every browser module parses. | [`62440eb`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/62440eb) |

### Corrections during the work

- **The page went blank while every check passed.**
  - A Python string replacement whose target was empty inserted the snippet
    between every character of `maze-race.js`, adding 70,000 lines.
  - The page threw "Illegal return statement" and never started.
  - All 45 checks still passed, because they only fetch the file.
  - Fixed by restoring the file from git and reapplying with exact edits.
  - Added `spec/browser-modules.test.ts`. I saw it fail on a deliberately
    broken module, then pass, and added a rule to `CLAUDE.md`.
- **The phone chase camera sat inside a wall.** The first third-person
  screenshot at 390×844 showed only brick. The camera now stays above wall
  height, and portrait screens get a wider field of view. Recorded as a
  `CLAUDE.md` rule.
- **Overview framing.**
  - The first overview was cropped to part of the maze. The distance is now
    computed to fit the maze in the narrower field of view.
  - Wall tops looked flat and dominant, so they now use a light sandstone
    texture.
  - The HUD title overlapped the player tags, and the clock label was cramped.

### Verification actually performed

| Check | Result |
| --- | --- |
| `pnpm check` (Node 24.21, local app) | 46/46 passed, including the new module-parse check. |
| Agent-driven headless Chrome with GPU (Metal), two isolated profiles, 1920×1080 and an emulated 390×844 | WebGL renderer active. Screenshots of home, countdown, map, third person, first person and phone third person. No page errors. |
| Third-person controls | 12 turn-then-forward moves (A/D/S to turn, W to walk) were all accepted by the server. Then the race finished in map view, both browsers showed the result, and the replay played on the phone profile. |
| WebGL fallback | **Not exercised.** The 2D path is wired up, but no run disabled WebGL. |

These were automated runs with emulated phone viewports. No human or
physical-device test of frame rate or controls has happened yet.

### Outstanding

- Frame rate and battery use on a real phone are unknown. Shadows and pixel
  ratio may need lowering on weak devices.
- Facing in first or third person is local only; an opponent sees the
  avatar's facing derived from its last move.
- Still open from milestone 2: human playtests, and whether switches create
  real decisions.

## 2026-11-01 — Milestone 4: original retro music and action sounds

### Request and decisions

The author requested Mario-like music/effects for movement, winning, flipping
and other actions in the updated 3D layout, small commits directly on main,
and maintained assessment records. Starting point: clean main at `0d6fb39`.
[Decision 0005](docs/decisions/0005-retro-audio.md) chooses original native
Web Audio synthesis, explicit opt-in and independent race music. No copied
game assets, new dependencies, external audio calls or server state changes.

### Work and commit evidence

| Change | Commit |
| --- | --- |
| Decision 0005 and audio invariants in CLAUDE.md before code. | `af0a6c7` |
| Original effects, melody, gain envelopes, lazy AudioContext, bounded voices/scheduler and lifecycle checks. | `8dd9923` |
| Confirmed-state cue policy: newer revisions only; distinct win/lose/interruption phrases. | `b34e03e` |
| Accessible sound/music disclosure, stored preferences and storage-failure handling. | `4a07e51` |
| Walking, turning, bumps, flips, ready/countdown/start/result/camera integration; live handler and static-serving checks. | `26a5ac9` |
| Describe structured API error bodies for the refusal test's type check. | `1a5b133` |
| Correct the phone-race sound menu's stacking layer and record the failure in CLAUDE.md. | `8a53f2a` |
| Usage/design/assessment notes and actual phone/desktop captures. | `02e9b09` |
| Exclude the focused sound disclosure from gameplay shortcuts; add a regression and harness rule. | `d8ad36a` |

The music runs only during a connected live race with a visible document.
Mute/hidden pages stop queued voices; leaving closes the context. Initial or
reconnected snapshots do not replay results or flips. Local step/turn sounds
follow prediction; confirmed shared flips and results follow server state.
Replays stay silent. All visual messages remain available without sound.

### Problems, corrections and process limits

- The event-policy test initially failed because its module did not exist.
  It passed after implementation. Most other audio tests were written with
  or after the code, not through a strict fail-first process.
- The refusal test passed at runtime but exposed `ApiError`'s body inferred
  as null-only. `26a5ac9` was committed before that type failure was corrected
  in `1a5b133`. The final full type check passes; intermediate commits should
  not be described as all independently green.
- In the browser, the menu worked in the mobile lobby but was behind the maze
  in a race. The mobile header's static positioning lost the stacking layer.
  Restoring relative positioning fixed it, verified by screenshots.
- Review found Space on the new `<summary>` was treated as a flip. A focused
  test failed with an unwanted `flip` call, then passed after excluding summary
  from gameplay shortcuts. Space now opens the menu in the browser too.

### Verification actually performed

| Check | Observed result |
| --- | --- |
| Full `pnpm check`, Node 24.21.0, isolated local server at port 8091 | **67/67 tests across 13 files passed**, including typecheck; 21 additional tests since the 3D baseline. |
| `pnpm check:evidence` | Passed: two reflection files and 10 existing PROCESS.md commit references resolve. This does not validate the old narrative for the new project. |
| `git diff --check` | Passed. |
| Audio unit/handler checks | Lazy unlock; mute during pending resume; unavailable audio; independent music; hidden/disposed cleanup; 24-voice cap; no stalled-clock backlog; duplicate/reconnect silence; confirmed/refused flips; start/countdown/results; keyboard isolation. |
| Agent-driven IAB at 390×844 and 1440×900 | Sound/music toggles, preference persistence, Space activation, countdown, 3D turn, map walk, wall refusal and live muting worked. No reported warning/error console entries during the check. Phone width and scroll width both 390. |
| Browser race setup | One actual browser client plus a synthetic opponent created/joined/readied through the isolated test API. The synthetic opponent had no live stream; the UI correctly showed it disconnected. Not a two-person playtest. |
| Visual evidence | [Phone](docs/evidence/2026-11-01-audio-phone.png) and [desktop](docs/evidence/2026-11-01-audio-desktop.png) show the corrected sound menu during a race. They do not establish sound quality. |

No local Docker build or TruffleHog run was performed; those are configured
in the existing GitHub workflow. No package installation was needed. A
disposable test database was used outside the repository; the existing port
8089 preview and its data were left alone. Temporary viewport overrides were
reset and browser test tabs closed.

### Delivery and remaining evidence

The commits above are local main commits at the time of this entry; push and
CI/deployment outcome will be recorded separately after observing them.
The requested records now include CLAUDE.md, current design, decision 0005,
this progress log, README usage notes and writing notes. Assessed PROCESS.md
remains the author's work.

Human listening, physical iOS/Android audio behaviour, device loudness,
repetition fatigue and measured battery/CPU impact remain unverified. Audio
tests prove scheduling and event routing, not whether the tune is enjoyable
or helps navigation. Snapshot-derived sound may miss cancelling flips between
observations; predicted steps can sound before a later server correction.

### Delivery observed later on 1 November 2026

- Pushed all ten implementation/documentation commits directly to `origin/main`,
  from `0d6fb39` through `65c096f`. Local and remote HEAD matched after the push.
- [GitHub Actions run 41288738945](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/actions/runs/41288738945)
  completed successfully for `65c096f`: Docker build, full spec/type check,
  process evidence check, verified-secret scan, course-key scan, Fly deployment
  and deployed-site availability check. No scanner finding was reported by the
  successful jobs; this is not a claim that a scan proves absence of secrets.
- A separate read-only smoke check of
  [the live site](https://comp4020-final-sharmakunal14.fly.dev) returned HTTP 200
  with the sound control present. Its three audio modules, race controller,
  camera switcher and input controller each returned HTTP 200 and matched local
  source byte-for-byte. No production race or player was created for this check.
- Stopped the disposable port 8091 server. The port 8089 preview was not stopped.
- This subsequent documentation-only commit records the observed delivery;
  the runtime remains the version verified by the linked successful run.

## 2026-11-01 — Fix: the 3D maze flickered when the camera moved

### Problem

The author reported flickering in the 3D view with a screen recording. The
recording could not be opened, because the macOS temporary capture file was
gone, so the cause was reproduced instead.

### Cause

Visible surfaces shared a plane, so the depth test picked a different one on
each frame (z-fighting):
- The desert ground disc and the maze floor's top face were both at y = 0.
- Wall caps were 1.04 units wide on a 1-unit grid, so neighbouring caps
  overlapped at the same height.
- The camera's 0.05–200 depth range left too little precision for distant
  surfaces.
- Gate fields also pulsed their opacity six times a second, which looked
  like blinking.

### Fix

- Lowered the ground below the floor.
- Built each wall as one box with a sandstone top face, removing the
  separate caps.
- Lifted floor decals (gate strips, trail dots, avatar rings) to at least
  0.03 above the floor.
- Narrowed the depth range to 0.15–160 and adjusted the shadow bias.
- Slowed the gate pulse, and stopped decorative spins when reduced motion
  is on.
- Added a `CLAUDE.md` rule: no coplanar surfaces, and a still scene must
  render identically frame to frame.

### Verification (agent-driven headless Chrome with GPU)

| Measurement | Before | After |
| --- | --- | --- |
| Pixels changing between frames of a still scene (reduced motion on) | 17–469 | 0 |
| Pixels flipping back and forth while the camera slowly orbits | 124–6,778 | 3–8 (edge smoothing noise) |

`pnpm check` passed (67/67) with the fix in place, including the audio
checks committed in a separate session. No automated test asserts frame
stability, because it needs a GPU browser; the measurement scripts were kept
outside the repo.

## 2026-11-02 — Fix: audio was inaudible; add Mario-style music and effects

### Problem

The author reported the audio "isn't working" and asked for Mario-like music
and effects for moving, winning, flipping and other actions, with constant
background music.

### Cause (measured, not assumed)

The engine ran: the context was `running` and notes were scheduled. But
every effect peaked at 0.03–0.08 (RMS about 0.005), which is close to
inaudible on a laptop (master 0.3 × voice 0.26 × a short envelope). In
addition:
- Sound was off by default, behind a small "Sound off" menu.
- Music played only during a live race, so the lobby and waiting room were
  silent.
- The tunes were short beeps with one eight-bar loop.

The existing audio tests all passed, because they checked that notes were
scheduled, not how loud they were.

### Work (small commits)

| Work | Commit |
| --- | --- |
| Decision 0006 and harness rules, written before the code. | `987c441` |
| Louder engine; slide/vibrato lead, triangle bass, drums; lobby, waiting, countdown and race tunes. | `cda2fec` |
| Level guard test, seen failing against the old gains first. | `a0568a2` |
| Tune follows the game phase and goes silent on disconnect or a result. | `d0cb42b` |
| On by default, visible mute button, M key (ignored while typing). | `262556c` |
| Retry the unlock after the page reloads on Create a race. | `7e09536` |
| Chime when a rival joins or readies up (failing first). | `aaba241` |
| Click for buttons; whoosh when stepping onto the goal (failing first). | `15bdf6a` |
| Click for the lobby buttons. | `12ce89e` |

### Corrections during the work

- **Waiting room was silent.** Creating a race reloads the page, which
  forgets audio permission. Found by an end-to-end browser run, not by the
  unit tests. Fixed by retrying the unlock; added to `CLAUDE.md`.
- **Typecheck caught two typing errors** in the new engine and one in the
  event helper, before any test ran.
- **Six old tests failed after the rewrite.** Each was checked before being
  edited: the fake audio node lacked methods the new engine uses (a gap in
  the fake), and four assertions encoded old exact values (two notes per
  step, a 24-voice cap). The voice-cap test now checks the bounded property.
  Two tests that assumed "silent by default" were rewritten, because that
  behaviour was changed deliberately.

### Verification actually performed

| Check | Result |
| --- | --- |
| `pnpm check` (Node 24.21, local app) | Typecheck clean; 79/79 tests passed. |
| Real Chrome, output tapped with an analyser, two isolated profiles | Effects peak 0.29–0.52. Waiting, countdown, race, rival-join, portal, win and lose all produce signal; no page errors. |
| Mute | Pressing M silences output (peak 0) and pressing it again restores it. |
| Cold visit with no click | No audio context is created, and no error is shown. |
| Music scenes, 5 s each | RMS 0.029–0.036, under the effects. |

### Not verified

- Whether it sounds like a classic platformer, and whether the loops
  tire. No human has listened; the checks above show only levels and timing.
- Real phone speakers, Safari and Firefox.

## 2026-11-02 — Full-screen race, first-person start, Exit button

### Change

- From the countdown to the result the stage is fixed to the whole viewport;
  the sound controls float above it. Clicking "I'm ready" requests browser
  fullscreen (needs a user gesture); fullscreen is released when the race ends.
  If the browser refuses, the full-window stage still applies.
- The camera switches to first person when the countdown starts (the existing
  view buttons and V still work). Facing stays local; the server is unchanged.
- An Exit button during the countdown and race leaves fullscreen and returns
  to the home page. It does not forfeit or end the race on the server; the
  link still reopens it.

Commit: 824ced2 (local, not pushed).

### Verification

- Module syntax check on `maze-race.js`; `pnpm test` against the local app:
  79/79 passed. No test covers the new button or fullscreen.

### Not verified

- No browser run: fullscreen, the first-person switch, the Exit button and the
  phone-sized layout have not been seen working. Safari fullscreen differs.
- Whether Exit mid-race should be treated as a forfeit is undecided.

## 2026-11-02 — Forfeit, rematch, result card, replay link, swipe turns

### Decision (from the author)

Leaving a started race **cancels it for both players: no winner, no stored
result, no best time**. Reason: a player could quit a second in and hand the
rival a one-second "best time". Exit asks for confirmation first. The cancelled
race is an `interrupted` game with `interruption: "forfeit"` and `forfeitedBy`.

### Changes

- `POST /matches/:id/forfeit` (members only; countdown or racing only; repeat
  is idempotent). `POST /matches/:id/rematch` (members only; after the race
  ends). Rematch makes one new race with both players seated; asking twice, from
  either player, returns the same race.
- Exit button opens a confirm dialog; "Leave and cancel" calls forfeit. The
  rival sees "<name> left the race" and can start a rematch.
- Finished races show a result card (winner, time, steps and flips per player,
  from the saved step log) and a "Copy replay link" button.
- Touch: swipe left/right to turn and down to turn back in 1st/3rd person; the
  forward button is larger in those views. The map keeps drag-to-orbit.
- Phone race header: sound button, then the connection chip, with the title
  card hidden during a race. The first phone screenshot had the sound button
  on top of the title card; fixed and re-shot.

### Verification

| Check | Result |
| --- | --- |
| `pnpm check` (typecheck + tests) against the local app | 83/83 passed (4 new: forfeit rules, forfeit over HTTP with no stored result, rematch seating and idempotence, rematch refused before the end). |
| Agent-driven Chrome (puppeteer-core, two isolated profiles), 1440×900 and 390×844 touch | Countdown and race: fullscreen granted, stage fills the viewport, first-person view selected automatically, Exit visible. Exit dialog opens; "Keep racing" leaves the race running; "Leave and cancel" returns to the home page; the rival's page shows the cancelled message; Rematch opens a new race. Script and screenshots in `docs/evidence/2026-11-02-*`. |

### Not verified

- Swipe turns (the script did not touch-swipe), the result card and "Copy
  replay link" in a browser, and a second player following into the rematch.
- Fullscreen in headless Chrome is not a human's fullscreen; Safari differs.
- The 404s in the console are a missing favicon, which predates this change.
- No human playtest.
- Rematch: the rival is not told automatically; they see the note only after a
  state update. Worth a look in a real session.

## 2026-11-02 — Replay shows the map only

The replay page hid nobody's point of view to follow, so the 1st/3rd person
buttons were meaningless there. They are now hidden, the view is forced to the
map, and the `V` shortcut is ignored in a replay. Checked in agent-driven Chrome
on a cancelled race's replay: view `overview`, buttons hidden, `V` does nothing,
no page errors. Not checked on a finished race's replay or on a phone.

## 2026-11-02 — Avatar designer, chat with reactions, winner celebration

Decision record: [0007](docs/decisions/0007-avatars-chat-celebration.md).

### Changes

- **Avatars:** shape (capsule, robot, blob, cone), accessory (crown, antenna,
  horns, cap, halo), face (visor, eyes, cyclops), finish (matte, glossy, neon)
  and a colour slider, plus a dice button for a random look. Live 3D preview in
  the lobby and waiting room. Choice is remembered in local storage, sent when
  creating or joining, and can be changed until the countdown (server refuses
  after). Both players see each other's look in 3D and in the 2D fallback.
- **Chat:** a dock with eight quick reactions and an 80-character text line.
  Reactions float over the stage so they are seen mid-race; new rival messages
  make a soft sound, show an unread count and are announced to screen readers.
  Local "Mute rival". Only the two players; rate-limited per player.
- **Celebration:** fireworks, confetti and a VICTORY banner for the winner for
  about seven seconds; still banner with reduced motion. Not shown to the loser
  and not when reloading a finished race.

### Verification

| Check | Result |
| --- | --- |
| `pnpm check` against the local app | Typecheck clean; 103 tests passed (new: look validation and locking, chat rules and limits, HTTP checks for look and chat, chat rendered as text, celebration lifecycle and reduced motion). |
| Agent-driven Chrome, two isolated profiles, 1440×900 and 390×844 touch | Designer renders (4 groups, 16 options, 3D preview); rival sees the chosen look; a change in the waiting room reaches the server; avatar card hides once racing; chat both ways with `<b>` shown as literal text, one reaction floated, unread count 2; Alice solved the maze through the API, saw fireworks and VICTORY, the loser saw none, effects removed themselves after the time. No page errors. Screenshots and script in `docs/evidence/2026-11-02-*`. |

### Problems found

- A script wrote invisible Unicode characters into a regex in
  `public/maze-chat-rules.js`, breaking the file; `pnpm typecheck` caught it and
  it was rewritten. Added to `CLAUDE.md`.
- The browser script stalled several times. The server answered in milliseconds
  and eight repeated runs without the script's tab handling all passed, so this
  was the script (only the front tab gets input), not the game.

### Not verified

- No human playtest: whether the celebration, chat and designer are enjoyable.
- Every accessory, shape and face was parsed and unit-tested for acceptance but
  only a few combinations were seen in screenshots.
- Real touch use of the designer and chat on a phone; Safari and Firefox.
- The "VICTORY" banner and an open chat panel overlap on a phone if the panel is
  left open (seen in the phone screenshot); not changed.

## 2026-11-02 — Spectators, streak and personal best, rematch card, result screens, layout

Decision record: [0008](docs/decisions/0008-spectators-stats-rematch-card.md).

### Changes

- **Avatar designer in front:** a modal opens when creating or joining a race
  (once per visit); "Edit your avatar" reopens it in the lobby and waiting room.
- **Layout:** "Today's best times" and "Your recent races" moved under the maze,
  so the lobby has no empty column. A streak and best-time card sits in the side
  column.
- **Result screens:** the loser now sees "<name> wins" with a kind line and a
  gentle rain; a spectator sees the winner's name; the winner keeps VICTORY.
  A line under each shows a new personal best and the streak.
- **Rematch card:** when one player asks for a rematch, the other sees a card
  slide in with "Join now", announced to screen readers; it takes them into the
  same new race.
- **Streak and personal best:** consecutive Sydney days with a finished race
  (alive through today), and the fastest win per maze. Per browser identity.
- **Spectators:** a spectator link in the waiting room (separate secret,
  `/watch/<token>`). Read-only live view with map, 1st and 3rd person and a
  "follow Alice / Bob" choice. No chat, movement or rematch for spectators;
  private fields are removed from what they receive. Limits: 20 per race, 64
  overall.

### Verification

| Check | Result |
| --- | --- |
| `pnpm check` against a fresh local database | Typecheck clean; 120/120 tests (new: streak maths incl. month and year boundaries, personal best, spectator token, privacy of the public game, spectator HTTP and stream, stats endpoint, loser and spectator banners, lobby markup). |
| Agent-driven Chrome, three isolated profiles (two players and a spectator), 1440×900 and 390×844 touch | Designer opens centred in front on Create; spectator link shown in the waiting room; the spectator page loads with no nickname, two follow buttons, no movement or chat; during the race the spectator selected 3rd person, then followed Bob in 1st person; winner saw VICTORY plus "First win on today's maze! · 1-day streak", the loser saw "ALICE WINS / Good race. Ready to go again?", the spectator saw "ALICE WINS"; Bob's rematch produced a card on Alice's page and "Join now" took her to the same race as Bob; the lobby then showed streak 1 and best 00:06.7. No page errors. |

### Problems found

- The leaderboard test failed on the last pushed code too: earlier browser
  checks had filled the local database with fast wins. Checks now run against a
  throwaway `DATA_DIR`.
- A test asserted no requests on mount; mounting now fetches the spectator link,
  so it now counts only move requests.
- The first rematch card position covered the race heading; moved to the bottom
  right. It still overlaps the footer text in the side column; it can be dismissed.

### Not verified

- No human playtest: the spectator link, rematch card, streak and result
  screens have only been used by an agent.
- A spectator joining mid-race, many spectators at once, and the spectator limit
  in a browser; limits are logic only.
- The streak across a real midnight and across days (tested as pure date maths,
  not over time); a returning player on a later day.
- Personal best when two different nicknames share a browser; Safari and Firefox.

## 2026-11-02 — One-step-at-a-time flow (local, not pushed)

The player found the landing page cluttered and asked for one step per screen
with smooth transitions (decision 0009). The maze is now full-bleed behind a
single card that moves through name, plan, join link, avatar dialog and the
waiting room, with a step indicator. Leaderboard and how-to-play moved into
dialogs; the spectator link is collapsed.

| Check | Result |
| --- | --- |
| `pnpm vitest run` against a local app with a throwaway `DATA_DIR`; `pnpm typecheck` | 121/121 tests, typecheck clean |
| Agent-driven Chrome, 1440×900 and 390×844 touch: name, plan, join, avatar, waiting room ([script](evidence/2026-11-02-flow-check.mjs)) | Flow completes on both sizes; no page errors beyond expected 401/404 probes |

### Problems found

- After creating a race the page reloaded and asked for the avatar a second
  time, because the invitation branch could not tell a seated creator from a new
  joiner. It now checks for a seat first.
- The connection chip and player pills sat under the new fixed top bar; moved down.
- The lobby markup test asserted the old layout and was rewritten.

### Second browser pass (same day, agent-driven Chrome)

Checked after the rewrite: second player joining by invitation link, the
spectator link on a 390×844 phone, ready, countdown and race, a forfeit
leading to the result card with Rematch, a signed-out replay link under
reduced motion ([script](evidence/2026-11-02-flow-check-2.mjs),
[phone spectator](evidence/2026-11-02-flow-phone-spectator.png),
[result](evidence/2026-11-02-flow-desk-result.png)). 121/121 tests still pass.

Problems found and fixed:

- Phone spectator: the Map/3rd/1st buttons stretched into a tall column and
  the follow buttons lost their names. Moved the camera buttons to the top
  right and restored the labels.
- In-race HUD (player pills) overlapped the title card; moved down.
- The "race recorded" hint overlapped the result card; hidden on result screens.

### Not verified

- A second player joining was driven over HTTP for the later steps, not
  through a second browser window for the whole race.
- The step indicator still shows five steps on the replay entry, where only
  the first applies.
- Winner screen with fireworks, loser screen and rematch toast were not
  re-checked visually with the new layout (forfeit result only).
- No human playtest; Safari and Firefox untried.

## 2026-11-02 — Pulse gates (local branch `pulse-gates`, not pushed)

The author proposed a 12-level design; we agreed to add one mechanic at a time.
First: pulse gates, a symmetric pair of timed gates per maze ([decision 0010](docs/decisions/0010-pulse-gates.md)).

| Work completed | Commit |
| --- | --- |
| Decision record before code. | `9588827` |
| Generator, shared rule, server timing, unit tests. | `a27f112` |
| 3D and 2D drawing with a warning before closing. | `30642f9` |
| Prediction, timing hint, replay drawing, help text. | `54e500f` |
| HTTP check of server timing. | `1c3f8ef` |
| Phone race hint moved below the title card. | `40de5fc` |

| Check | Result |
| --- | --- |
| `pnpm check` with `APP_URL` pointing at the new code on port 8090, throwaway `DATA_DIR` | 124/124, typecheck clean |
| Same unit and HTTP pulse tests with the server rule disabled | both fail, as intended |
| Committed vs new generator, 800 ids | 0 changed mazes/switches/gates |
| Agent-driven Chrome 1440×900 (WebGL), 2D fallback (WebGL off), 390×844 touch | gates drawn open/closed/warning; phone player refused at a closed gate, walked through when open; hint counts down; no page errors |

### Problems found

- Placement rules left 154 of 400 mazes without pulses; loosened to 13 of 400.
- The first HTTP pulse check passed only because it hit an old server on 8080
  and skipped. Fixed the test's timing base and checked it fails without the rule.
- Bars were hard to see from the map camera; thickened and recoloured.
- The phone race hint covered the title card (also true of the switch hint).

### Not verified

- Replay drawing of pulse gates was not checked in a browser.
- The race clock still overlaps the "Live" chip at 390×844 (existing issue).
- No human playtest of the 2.5 s rhythm; Safari and Firefox untried.

## 2026-11-03 — Fog option, rifts, spectators follow rematches (local, pushed to `pulse-gates`)

The author asked for fog and portals after pulse gates, then for spectator
links to carry over into rematches. Decisions [0011](docs/decisions/0011-fog-option.md)
and [0012](docs/decisions/0012-rifts.md).

| Work completed | Commit |
| --- | --- |
| Decision records for fog and rifts, before code. | `eb654ea` |
| Fog saved with the race, kept in rematches, marked on the board. | `143c587` |
| Clear/Fog choice and waiting-room label. | `83b72c5` |
| Fog drawing in 3D and 2D, goal beams as landmarks. | `d19f5d0` |
| Rift pair per maze, rift-aware generator, step-log upgrade. | `50adeaa` |
| Rift drawing, prediction, replay count, help text. | `cf546f0`, `d3aba96` |
| HTTP rift check; batching check fails fast instead of hanging. | `b5b4d40` |
| Spectator link follows rematches. | `3e22249`, `2f4d664` |

| Check | Result |
| --- | --- |
| `pnpm check` against the new code on port 8090 | 132/132, typecheck clean |
| Rematch-follow tests with the chain lookup disabled | both fail, as intended |
| Committed vs new generator over 800 ids (excluding new fields) | 0 changed mazes/switches/gates |
| Agent-driven Chrome: fog in 3D (map, 3rd) and 2D; rift jump in 3D and 2D; spectator page through a forfeit and rematch | all as intended, no page errors |

### Problems found

- Rift savings were wrong twice: first a rift cell was treated as walkable
  (stepping on one always teleports), then savings ignored gates that start
  open. Seed 1 had a rift saving nothing. Both fixed; a 200-seed test checks
  every rift saves at least 4 steps at race start.
- The step log's CHECK allowed only 'step' and 'flip'; deployed databases
  need a one-time table copy, tested against an old-schema database.
- First fog looked like a grey slab and washed out the map camera; changed
  to cloud blocks with haze measured from the camera.
- One full test run hung 439 s in the batching check, which re-sent a
  refused batch forever. Not reproduced; the loop now fails with the code.
- The spectator page did not draw pulses or rifts; fixed with the rematch work.

### Not verified

- Fog and rifts not tried by a human; Safari and Firefox untried.
- Fog is not secret: a player can read the layout from the API (by design, 0011).
- The table upgrade has not run against the production volume yet.

## 2026-11-03 — Merge to main, and four worlds of levels (branch `worlds`)

**Merge.** PR #2 (pulse gates, fog, rifts, spectator rematch) passed CI and was
merged; the deploy job succeeded. The live `/api/maze/today` now returns
pulses and rifts, and the lobby has the fog choice. Not verified: the
production step-log table upgrade (fly CLI not logged in on this machine; the
server answered after start, which runs the upgrade first).

**Worlds** ([decision 0013](docs/decisions/0013-worlds-and-levels.md)), as
planned with the author; author chose "finishing unlocks the next level".

| Work completed | Commit |
| --- | --- |
| Decision record before code. | `0e7bc8d` |
| Generator takes a spec (size, switches, pulse rhythms, rifts, loops); daily unchanged. | `4b54e5e` |
| Twelve levels, each checked for mechanics and fairness; fingerprints pinned. | `be2a9ca` |
| Level races, unlocking by finishing, rematch keeps level, next level. | `15a3a99`, `267700f` |
| Level layout endpoint; remembers a next-level invitation. | `e791273` |
| World picker in the lobby. | `11fa993` |
| World colours in 3D and 2D. | `d9c285f` |
| Level title, Next level button and toast; spectators and replays themed. | `3348320` |

| Check | Result |
| --- | --- |
| `pnpm check` against the new code on port 8090 with a fresh `DATA_DIR` | 140/140, typecheck clean |
| Old vs new generator, 800 daily ids | 0 changed |
| Agent-driven Chrome (3D and 2D): picker shows 11 locked; play 1-1, lose, Next level opens 1-2 for both | as intended, no page errors |
| One level per world rendered in 3D | four distinct looks ([grid](docs/evidence/2026-11-03-worlds-themes.png)) |

### Problems found

- My first seed search used a different seed form than the real code, so it
  claimed every level worked first time. The level test caught 3-1 with no
  pulse gate. Three levels now carry an explicit, commented `seed`.
- First world colours were murky (olive garden) and the desert hills stayed;
  brightened, and hills recoloured per world.
- The "today's best times" HTTP check fails on a reused test database once ten
  faster runs exist there (routes got shorter with rifts). It passes on a
  fresh `DATA_DIR`; the check depends on test-database state.

### Not verified

- No human has played a level; difficulty and time targets untested.
- Levels 2-1 to 4-3 were checked by tests and one render each, not played
  through in a browser.
- World 4's caps take a pink tint from the sand texture.

### Deployed (same day)

PR #3 passed CI, was merged (`367848b`) and the deploy job succeeded. Live
checks: `/api/maze/level/4-3` returns a 15×15 maze with 4 gates, 4 pulse
cells and 2 rifts; the lobby has the worlds button; the agent-driven browser
flow (pick 1-1, lose, Next level, land on 1-2) passes against the live site
([script](docs/evidence/2026-11-03-worlds-live-check.mjs)).

False alarm worth recording: the first live browser run "failed" because the
script waited 1.5 s for the race page, and software WebGL in headless Chrome
took over 6 s to build the scene on the live page. Traced by watching every
title write and request; the app was correct. The script now waits for the
race view instead of a fixed delay.

## 2026-11-09 — Review fixes: spectator seat, action logs, personal-best note, phone HUD

A review of the code against `CLAUDE.md` and the crit 10 brief found four
issues, each reproduced before fixing.

| Issue | Fix | Check | Commit |
| --- | --- | --- | --- |
| A spectator could take an empty seat: `publicGame` sent the race id, which is also the invitation, and `/join` accepted it. The existing test *expected* the id. | Public view drops `id`, adds an opaque `race` key | New HTTP check over the read endpoint and the stream; test fixed to assert the promise | `8b9b3fa` |
| Maze Duel did not log actions, so the crit 10 "read the logs" narration had nothing to read | `maze.*` JSON lines for every action and refusal, after commit | `spec/maze-logs.test.ts` reads a real server's stdout; fails on the old handler | `27ce3b3` |
| The personal-best note vanished after a win that was not a new best: a timer named `clock` shadowed the formatter, and the error was swallowed | Timer renamed | `spec/maze-race-shadow.test.ts`, seen failing on the old file | `acba4f1` |
| Phone race clock overlapped the connection chip | Chip stacks under the title on phones | Agent-driven Chrome measured box overlap at 390×844, 360×640, 1440×900: overlap on both phones before, none after ([script](docs/evidence/2026-11-09-hud-overlap-check.mjs), [after](docs/evidence/2026-11-09-phone-hud-fixed.png)) | `a379de4` |

`pnpm check` 143/143 against the new code on port 8090 with a fresh `DATA_DIR`.

### Not verified

- The note fix was checked by the static test, not by playing two wins in a browser.
- The logs have not been read on Fly yet (the fly CLI is not logged in here).

## 2026-11-09 — README argument and evidence review

- At the author's request, replaced the factual README notes with an
  agent-assisted argument: shared route choices, inspectable results and
  continuing together after a loss. The rendered text is 578 words, including
  headings and setup instructions. First-person judgments remain for author
  review; no new personal experience or playtest observation was invented.
- Checked the final-project brief and the two linked sources (Robin Sloan
  and Gabriel Gambetta). Distinguished design intentions and informal friend
  feedback from executable rules and agent-driven browser verification.
- Named limits: seven campaign levels lack switches, latency can affect close
  finishes, server restarts interrupt active races, cookie loss loses identity,
  fog is not secret information, and visual navigation is not fully accessible.
- Reviewed the four correction commits. A fresh temporary database/server
  passed `pnpm check`: TypeScript and 143 tests across 21 files. The served
  `/readme/` returned HTTP 200 and its full main text matched README.md, not
  merely its headings. Agent-driven IAB inspection at 1920×1080 and 390×844
  showed readable text and no horizontal overflow. These are local checks;
  this documentation has not been deployed or committed in this session.
- Additional isolated check found a remaining log leak: a non-player GET of
  an existing match returned 403 (`NOT_A_PLAYER`), but `maze-http.ts` used the
  final URL segment as the log action and exposed the full invitation id.
  The new logging test does not cover this path. No credentials or invitation
  values were printed in the check's report. Follow-up: use fixed action names
  and cover forbidden match reads and invalid watch-token refusals; application
  code was not changed during this writing session.
- The personal-best regression remains a static name-shadowing check, not a
  browser demonstration of two wins. The previous entry contains the phone-HUD
  browser measurements; they were not rerun as gameplay checks here.

### Deployed (2026-11-09)

PR #5 (Shared Space out of README and PROCESS.md, `38c3122`) and PR #6 (the
four review fixes, `834733b`) were merged; both deploy jobs succeeded.

| Live check | Result |
| --- | --- |
| `/readme/` | no "Shared Space"; headings Play, Rules and limits, Run locally, Development records, Verification |
| Spectator read endpoint and stream | no race id in either; `race` key present |
| Spectator page through a forfeit and rematch (agent-driven Chrome) | follows to the new race on the same link |
| Phone HUD at 390×844 and 360×640 (bounding boxes) | no overlap ([screenshot](docs/evidence/2026-11-09-live-phone-hud.png)) |
| `pnpm vitest run` with `APP_URL` set to the live site | 143/143 |

Not verified: the new `maze.*` log lines on Fly itself (fly CLI not logged in
here); the log test ran against a local server.

## 2026-11-09 — Race fills the browser window, not the device screen

The player found the jump out of full screen at the end of a race jarring and
asked for the game to use the Chrome window's size instead. The Fullscreen API
calls (on Ready, at the countdown, on finish and on Exit) were removed; the race
layout already fills the window with CSS.

| Check | Result |
| --- | --- |
| Agent-driven Chrome at 1200×760: window and stage size in the waiting room, racing and on the result | 1200×760 throughout, never full screen ([result](docs/evidence/2026-11-09-window-result.png)) |
| `spec/maze-window-size.test.ts` (no `requestFullscreen`/`exitFullscreen` in browser code) | passes |
| `pnpm check` on a fresh `DATA_DIR` | 144 passed |
