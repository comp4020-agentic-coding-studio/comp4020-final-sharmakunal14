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
