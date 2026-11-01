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
