# Writing notes for README.md and PROCESS.md

Raw material for the author. These are notes, not prose to paste in: the
brief asks for README.md and PROCESS.md to be written by you, in your own
voice. Every claim below points at something checkable. Keep it updated.

Targets: README 400–600 words, published at `/readme/`. PROCESS.md
900–1100 words, rewritten rather than appended. Due Mon 9 Nov 2026, 12:00.

---

## README: what "good" could mean for Maze Duel

These early candidates are superseded by the 9 November README draft and
notes below. In particular, server validation is not cheat prevention, and
batching is not a guarantee that latency never affects speed or outcomes.

A candidate thesis to argue or reject:

> A two-person race is good when **what the other person does changes your
> game**, the result is **fair and settled by the server**, and it **stays
> worth coming back to**.

Each strand, with where it is enforced (E) or judged (J):

| Claim | Enforced by | Judged by |
| --- | --- | --- |
| The opponent matters. Switches change the maze for both players at once. | E: `spec/maze-game.test.ts` "flips a switch … for both players"; HTTP refusal checks | J: does anyone actually weigh "help me vs. help them"? Needs a playtest. |
| Fair start. Same distance, mirrored layout. | E: 200-seed sweep checks symmetry and equal shortest route | J: equal distance ≠ equal difficulty to *discover* (route-finding asymmetry) |
| No one gets trapped. | E: every open cell reaches both goals in all 4 switch states, over 200 seeds; a flip can't close a gate on a player | n/a |
| A slow connection costs latency, not speed. | E: HTTP check, 300 ms simulated round trip, per-step pace < 2.5× the interval | J: feel under real mobile networks is untested |
| The server decides; clients can't cheat. | E: sequence/batch checks, wall/gate refusal, speed allowance, membership checks | Not claimed: latency compensation on close finishes |
| Worth returning to. Daily maze, best times, replays. | E: results/best/replay checks; persistence across a real process restart | J: is a daily maze + leaderboard enough reason? |

**What you chose not to build, and why** (README asks for this):
- **Map reveals, footprint trails, power-ups.** These add randomness without
  making the opponent's choices matter more (decision 0003).
- **Free-roam 3D movement.** There is a 3D world with map, 3rd and 1st-person
  cameras (decision 0004), but movement stays on the grid, so the server's
  authority stays simple. Facing is local presentation only.
- **Accounts.** A cookie identity is enough for "two separate browsers"; a
  real account would bring password and recovery work with no game value.
- **A new random maze per race.** Times would not be comparable; a daily
  maze makes the leaderboard mean something.

**Sources worth reading and citing** (verify each before citing; these are
suggestions, not checked quotes):
- Glenn Fiedler, "What Every Programmer Needs To Know About Game Networking"
  (gafferongames.com): client-side prediction and server authority.
- Gabriel Gambetta, "Fast-Paced Multiplayer" series (gabrielgambetta.com):
  prediction and reconciliation, which is what `maze-race.js` does.
- Robin Sloan, "An app can be a home-cooked meal" (2020): small software for a
  few people. The course brief points at this genre.
- Wordle's daily-puzzle design: one shared puzzle per day makes results
  comparable and social. Find a primary source, e.g. Josh Wardle interviews.
- Jamis Buck, *Mazes for Programmers*: Kruskal's algorithm and loops ("braid")
  versus perfect mazes.
- Course readings on "the small web" (check the course site).

---

## PROCESS.md: material

### The story arc (your choice of framing)

1. Shared Space (crits 8–9), then a pivot to Maze Duel. Why pivot?
2. First playable version: technically solid (32 tests), but an audit found
   "two people playing single-player at the same time."
3. Milestone 2: decided **in the harness first** (`95fb936` changes CLAUDE.md
   and adds decision 0003 before any code), then implemented.
4. Corrections that landed in the harness or spec (below).

### Stack case (why, trade-offs)

- **Node 24 running TS directly, node:sqlite, plain JS.**
  - No build step and no runtime dependencies, for a 256 MB machine.
  - Cost: no type checking of browser JS. Shared rules live in
    `public/maze-rules.js`, imported by both the server and the client.
- **HTTP commands plus SSE snapshots, not WebSockets.**
  - The lag problem was the one-step-at-a-time waiting, not the transport.
    Batching fixed it without changing transport (decision 0003).
  - Full snapshots make reconnecting trivial.
  - Cost: more bytes per update than sending only changes.
- **Three.js vendored, not React Three Fiber or a CDN.**
  - No build step, and nothing at marking time depends on a CDN.
  - Cost: about 170 KB gzipped (decision 0004).
- **Server authority plus client prediction.**
  - The client draws its own steps immediately; the server snapshot always wins.
- **Seeded generation (date as seed), with the layout stored in the match.**
  - Reproducible and testable.
  - Old races never change even if the generator changes.

### Corrections that reached the harness or spec (cite these)

| What went wrong | Where the fix landed | Commit |
| --- | --- | --- |
| Phone layout pushed the controls off screen (milestone 1) | CLAUDE.md rule on the 390×844 layout | `66194c4` |
| Markers hid each other when sharing a cell | CLAUDE.md rule plus a render offset | `f073cdb` |
| Generator broke symmetry in 86/400 seeds; 180/400 had no switch pair | 200-seed sweep test | `790c9ea` |
| Sender could reuse a sequence number after `clear()` mid-flight | "never reuses a sequence number" test | `e5231c7` |
| Scripted edit corrupted `maze-race.js` (blank page) while all 45 checks passed | `spec/browser-modules.test.ts`, seen failing first, plus a CLAUDE.md rule | `62440eb` |
| Phone chase camera inside a wall | CLAUDE.md rule: camera stays above wall height | `d77f9ea` |
| One-in-flight movement made speed depend on lag | CLAUDE.md speed-allowance rule plus the 300 ms HTTP check | `95fb936`, `792166e` |

### Honest gaps (a stronger PROCESS.md names them)

- Fail-first was **not** followed in milestone 2: tests were written with or
  after the code (PROGRESS.md says so).
- The recorded browser checks were agent-driven, with emulated phone and
  latency. The author subsequently reported that friends played Maze Duel
  and called the idea cool; no structured observations of their play were supplied.
- The README "good" argument has not yet been tested against real players.

### Agent workflow notes

- The agent audited first and was told to be critical, then implemented.
- The harness was updated before the code for milestone 2.
- A Puppeteer script driving two isolated Chrome profiles was the browser
  check. It was kept outside the repo, so it is not committed evidence.
- Decision records (0002, 0003) hold the alternatives; PROCESS.md can link
  them instead of restating them.

---

## Open questions to settle by playtest (before writing "good")

1. Do players notice and use the switch? How long until they understand the key?
2. Is flipping your own switch always right? If it is, there is no dilemma,
   and you would want an asymmetric effect.
3. Does the daily leaderboard make people want another go?
4. Do phone players manage with the d-pad, or need swipe input?
5. Which camera do people choose? Does first person make the race harder,
   but in a fun way? Is it a fair choice if one player uses the map?

## 1 November 2026 — Audio iteration (raw evidence for later reflection)

- Author request: Mario-like music/effects for movement, winning and flipping;
  small commits directly on main, plus harness/design/progress records.
- Interpretation: original retro square/triangle-wave synthesis, not imported
  game recordings or copied melodies. No audio package or asset downloads.
- Decision 0005 explains synthesis vs bundled files/library, explicit opt-in,
  and why confirmed flips/results differ from immediate predicted footstep cues.
- Enforced: 21 added tests cover lifecycle, voice limits, preferences, duplicate
  snapshots, reconnect baselines, refused flips, countdown and camera controls.
  Full suite: 67 tests across 13 files; type check and evidence check passed.
- Fail-first was partial: the event-policy suite failed because its module was
  absent, then passed after implementation. A later focused regression first
  demonstrated that Space on the sound disclosure called `flip`, then passed
  after adding `summary` to the gameplay shortcut exclusions. The remaining
  audio tests were written with or after their implementation. Do not call the
  whole iteration strict TDD.
- Correction: refusal test exposed the inferred-null API error body type. The
  integration commit preceded that correction; `1a5b133` adds the JSDoc contract.
- Browser correction: the mobile lobby menu worked, but the active-race header's
  `position: static` put the menu behind the stage. `8a53f2a` restores a positioned
  layer and adds the discovered rule to CLAUDE.md. Check real interaction states,
  not only the landing screen.
- Agent-driven IAB checks at 390×844 and 1440×900: preferences after reload,
  keyboard/touch-style controls, countdown, turn, walk, wall refusal, mute; no
  reported console errors. A synthetic API opponent filled/readied the other
  seat, without keeping a second stream online. This was not a human playtest.
- Committed [phone](evidence/2026-11-01-audio-phone.png) and
  [desktop](evidence/2026-11-01-audio-desktop.png) captures show the repaired menu.
  Screenshots demonstrate layout, not audible output.
- Still judge with people: volume at normal device settings, short-loop fatigue,
  distinguishability of flip vs refusal, and whether sound improves navigation.
  Physical iOS/Android audio behaviour and battery cost are unmeasured.
- Source for browser constraints:
  [MDN Web Audio best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices).
  These are supporting notes, not a replacement for the author's assessed prose.

## Avatars, chat and the win celebration (2026-11-02)

Raw material, not prose.

- The author asked for these to make the game more enjoyable. Decision record:
  [0007](decisions/0007-avatars-chat-celebration.md).
- Design tension worth discussing: free expression (chat, custom avatars) versus
  keeping the server authoritative and safe. Looks are whitelisted names plus
  a number; reactions are sent by name; chat text is length-limited, cleaned
  and drawn as text. Chat is a way to be unkind, so there is a local mute.
- Locking looks at the countdown keeps replays faithful to the race.
- A bug from the process: a script wrote invisible Unicode characters into a
  regex, which broke the file; the typecheck found it. The fix was to build the
  backslashes explicitly. Recorded as a rule in `CLAUDE.md`.
- Browser-check gotcha (not a product bug): two tabs in one headless browser
  only reliably receive input in the front tab, which looked like a hang.
- Not evidence of fun: nobody has playtested the celebration, the chat or the
  designer. Open questions: is seven seconds too long, are eight reactions the
  right set, do people use the dice button.
- Evidence: [victory desktop](evidence/2026-11-02-victory-desktop.png),
  [victory phone](evidence/2026-11-02-victory-phone.png),
  [avatar and chat](evidence/2026-11-02-avatar-chat-desktop.png).

## Spectators, streaks, rematch card, result screens (2026-11-02)

Raw material, not prose. Decision record: [0008](decisions/0008-spectators-stats-rematch-card.md).

- Feedback from playing it: the lobby had a large empty area, the avatar
  designer was buried, only the winner got a result screen, and a rematch gave
  the other player no sign. Each was a gap a person found by looking at the
  screen, not something the tests would have caught.
- Spectator design question: how do you let people watch without weakening
  "exactly two players"? Answer: a separate secret, read-only, with private
  fields stripped. Trade-off recorded: a bearer link cannot be revoked.
- A test that failed for a reason unrelated to the change: the leaderboard
  test broke because earlier browser checks had filled the local database with
  fast wins. It also failed on the last pushed code. Fixed by running the
  checks against a throwaway data directory (`DATA_DIR`).
- Another test failed because new code made one extra request on start; the
  test was narrowed to the requests it was about.
- Not evidence of fun or clarity: no one else has used the spectator link, the
  rematch card or the streak. Open question: is the streak meaningful when it
  belongs to a cookie rather than an account?
- Evidence: [designer dialog](evidence/2026-11-02-avatar-dialog.png),
  [loser screen](evidence/2026-11-02-loser-screen.png),
  [spectator first person](evidence/2026-11-02-spectator-first-person.png),
  [lobby layout](evidence/2026-11-02-lobby-layout.png).

## 0009 one-step-at-a-time flow (2026-11-02)

- Trigger: the player said the landing page felt cluttered and "bombarded with
  everything at one screen". Decision: [0009](decisions/0009-one-step-at-a-time-flow.md).
- Reason for the design: one primary action per screen, secondary content on
  request, a step indicator, directional slides. Used the ui-ux-pro-max guidance.
- Bug found by browsing the result: the avatar dialog opened twice for the
  creator. Fixed with a seat check before the invitation branch.
- Not evidence of clarity: no other person has used the new flow. The join-as-
  second-player path was not re-run in a browser.
- Evidence: [name step](evidence/2026-11-02-flow-desk-1-name.png),
  [plan step](evidence/2026-11-02-flow-desk-2-choose.png),
  [avatar step](evidence/2026-11-02-flow-desk-4-avatar.png),
  [waiting room](evidence/2026-11-02-flow-desk-5-wait.png),
  [phone plan](evidence/2026-11-02-flow-phone-2-choose.png).

## 0010 pulse gates (2026-11-02)

- Trigger: the author brought a large "Rift Runners" design (12 levels, many
  mechanics). The agent recommended one mechanic instead; the author agreed to
  go step by step. Decision: [0010](decisions/0010-pulse-gates.md).
- Why pulse gates: deterministic, server-owned, symmetric, fit the "maze
  changes on its own" idea, and keep the existing reachability proof (closed
  = wall). Rejected for now: rotating rooms (move cells), portals (camera and
  replay jumps), reveal ability and footprints (already out of scope).
- Design constraint kept: pulses use a separate seed stream. Checked against
  the committed generator over 800 ids: 0 layouts changed, so today's best
  times stay comparable. 13 of 400 seeds have no pulse pair and play without.
- Correction 1: the first placement rules were too strict; 154/400 mazes had
  no pulse pair. Loosened spacing to bring it to 13/400.
- Correction 2: the first new HTTP check passed vacuously, because the test
  run hit an older server on port 8080 with no pulses and the test skipped.
  Re-ran against the new code on another port; then it failed because it
  timed phases from a `startsAt` read before ready (null). Fixed, and checked
  it fails when the server ignores pulse timing.
- Correction 3: first 3D bars were thin amber on sand and hard to see from the
  map camera; made thicker and orange.
- Open question for playtest: is 2.5 s / 2.5 s the right rhythm, and does a
  timed shortcut create a real choice?
- Evidence: [3D open](evidence/2026-11-02-pulse-open-3d.png),
  [3D closed](evidence/2026-11-02-pulse-closed-3d.png),
  [2D closed](evidence/2026-11-02-pulse-closed-2d.png),
  [phone hint](evidence/2026-11-02-pulse-phone-hint.png),
  [script](evidence/2026-11-02-pulse-check.mjs).

## 0011 fog, 0012 rifts, spectator rematch (2026-11-03)

- Trigger: author asked for "1 and 2" (fog and portals), then that the
  spectator link should continue into a rematch.
- Fog is a race option, not a daily mechanic, so players choose and daily
  times stay comparable. Presentation only; honestly not secret (0011).
- Rifts named to avoid a clash with the existing "portals" (the entrances).
- Correction worth citing: the rift generator's first estimate was wrong in
  two ways (rift cells walkable; gates open at start ignored). Found by a
  200-seed test that compared real routes, not by looking at pictures.
- Correction: SQLite CHECK on the step log needed a migration; test builds an
  old-schema database and upgrades it.
- Spectator design choice: follow the chain on the server, expose only
  `rematched: true` so the new race id (a seat) never leaks to watchers.
- Evidence: [fog map](evidence/2026-11-03-fog-3d-map.png),
  [fog 3rd person](evidence/2026-11-03-fog-3d-third.png),
  [fog 2D](evidence/2026-11-03-fog-2d.png), [fog choice](evidence/2026-11-03-fog-choice.png),
  [rift 3D](evidence/2026-11-03-rift-3d.png), [rift 2D](evidence/2026-11-03-rift-2d.png),
  scripts `evidence/2026-11-03-*-check.mjs`.

## 0013 worlds and levels; merge to main (2026-11-03)

- Trigger: the author asked to implement the worlds "as we had planned" and to
  see a brief plan first. The agent proposed 4×3 levels from existing
  mechanics, named what was dropped (footprints, rotating chamber, two floors,
  shifting walls) and asked two questions (unlock rule; substitutions). The
  author chose "finish unlocks" and approved.
- Key design reasons (for the README argument): levels are fixed so times are
  comparable; progress derived from saved races (same pattern as the streak);
  unlock by finishing so the weaker player is not stuck (from the original
  brief); invited player can join any level; one shared rematch/next link so
  players never split up.
- Correction worth citing in PROCESS: a throwaway seed-search script gave a
  false "all levels fine" because it used a different seed string from the
  real code; the permanent test found it. Lesson: check with the same code
  path the app uses. Fix is visible in `public/maze-levels.js` (`seed`).
- Correction: a flaky check (best times) depends on test-database state; noted
  rather than hidden.
- Merge: PR #2 passed CI; live API verified to serve pulses and rifts.
- Evidence: [picker](evidence/2026-11-03-worlds-picker.png),
  [four worlds](evidence/2026-11-03-worlds-themes.png),
  [next level](evidence/2026-11-03-worlds-next-level.png),
  [2D level](evidence/2026-11-03-worlds-2d.png),
  [script](evidence/2026-11-03-worlds-check.mjs).
- Open questions for playtest: are world 1 levels too easy to matter? Is 4-3
  (fog + everything) fun or just confusing?
- Deployed via PR #3. A live browser check first looked like a bug (race
  page stuck in the lobby); it was the test's fixed 1.5 s wait against slow
  software WebGL. Lesson for PROCESS: wait for a state, not a time.

## Review fixes (2026-11-09)

Strong PROCESS material: each was found by review, reproduced, and fixed in
the harness or spec rather than patched.

- **A test locked in a security hole.** The spectator test asserted that the
  public view contained the race id. The id is also the invitation, so a
  watcher could join an empty seat. The test encoded the current output, not
  the promise ("spectators are read-only"). Fix: `8b9b3fa`; rule in `CLAUDE.md`
  ("check the promise, not the current output").
- **Claimed capability with no evidence.** Crit 10 asks you to read the logs
  while classmates play; Maze Duel logged nothing. Now every action and
  refusal is logged, and a check reads a real server's output and fails if a
  cookie, chat line, nickname or full race id leaks (`27ce3b3`). Do not claim
  log narration from before this commit.
- **A swallowed error hid a feature.** `clock` shadowed by `setInterval`;
  `try/catch` hid the throw (`acba4f1`). Rule added about swallowed errors.
- **An acknowledged bug stayed fixed only when measured.** Phone HUD overlap
  checked by bounding boxes at three sizes (`a379de4`).

## README argument draft (2026-11-09)

- The initial 578-word README draft
  argues for shared route decisions, an inspectable result, and continuing
  together after either player wins.
- Sloan's *An app can be a home-cooked meal* and Gambetta's *Client-Side
  Prediction and Server Reconciliation* were read and checked in this session.
  README links both and applies them to audience, reliability and latency;
  this does not establish that the author read them before implementation.
- Bound the central claim: switches are optional, seven campaign levels have
  none, and timed gates/fog are navigation challenges rather than evidence of
  decisions about an opponent. Symmetry is not equal perceived difficulty.
- Human evidence supplied by the author: classmates liked Shared Space but
  found arranging objects plain and suggested a more creative game. The author
  clarified that friends who played Maze Duel loved the idea of competing and
  the switch concept. Players also asked for smoother controls and suggested
  different camera perspectives. This supports appeal within the intended
  audience and identifies concerns about control feel; no observations of route
  changes or repeat play were supplied. The author subsequently confirmed that
  this feedback preceded and informed the control and camera changes. The
  camera implementation is recorded in `d77f9ea`; the connection to player
  feedback comes from the author's retrospective account here, not from a
  contemporaneous playtest record. No follow-up player evaluation of the
  improvements has been supplied. Do not turn these accounts into structured
  playtest observations or a claimed Crit 10 log exercise.
- New limit to the logging correction above: an isolated non-player GET of an
  existing match returned 403 but logged the complete invitation id in the
  `action` field, through the catch block in `maze-http.ts`. The 143-test suite
  passes without covering this refusal path. The README does not promise log
  privacy. Fixed afterwards: refusal actions are named from a fixed list, and
  the log check now covers an outsider's read and a bad spectator token
  (seen failing on the old code first).

## Reflection revisions (2026-11-09)

- The author asked to update the three final-project reflections. Crits 8 and
  9 remain accounts of Shared Space: Crit 8 makes the initial definition of
  good explicit; Crit 9 explains the cost of named-room access and refusing
  stale edits instead of using edit locks. These are portfolio revisions on
  9 November, not claims that the revised prose was present at earlier cutoffs.
- Added `reflections/crit-10.md` as a clearly labelled retrospective reflection.
  It describes local concept validation at Crit 10, the competition/switch
  feedback, and the requests for smoother controls and camera perspectives.
  It connects those requests to subsequent implementation without claiming
  follow-up player satisfaction. The later logging commit is explicitly
  distinguished from evidence of observations at the crit.
- Asked the author for the actual URL-only, two-classmate log-narration
  account: which version, what happened, and what could be read from logs.
  The author clarified that the feedback loop occurred during Crit 10 while
  starting Maze Duel locally to validate the concept. The reflection now uses
  that actual account. No deployed URL-only log-narration account was supplied;
  it does not claim that exercise occurred. Do not infer from this silence
  that the exercise definitely did not happen.

## PROCESS account drafted (2026-11-09)

- Replaced the placeholder with a 1,064-word account. It connects Shared Space
  and Maze Duel through shared-state correctness, player feedback and the
  changing purpose of another person's presence. It keeps the Crit 10 local
  prototype account separate from implementation commits beginning 1 November.
- Reviewed the history, selected implementation/test/harness diffs, decision
  records and progress entries. The account cites 28 distinct real commits,
  plus local records and the two sources also used in README. Source positions
  are framed as evaluation of the final argument, not invented early research.
- Selected corrections: the browser-module parse gap, testing against a stale
  server, a spectator test that expected an invitation leak, and audio tests
  that checked scheduling rather than audibility. Each identifies what changed
  in the harness or checks and what that correction still cannot establish.
- Preserved limitations: incomplete fail-first practice, informal feedback,
  emulated browser checks, seven levels without switches, and the unresolved
  refusal-log leak. The text does not claim the URL-only log-narration exercise
  happened.
- Documentation verification passed: word range, all 28 commit links, six
  local file/heading links, and `pnpm check:evidence`. The instruction commit
  `95fb936` is an ancestor of the cited implementation commits. These checks
  validate references and structure, not the quality of personal judgments.

## Research-note sources and scope (2026-11-09)

- Added `research-note.md`: 637 words of argument,
  728 with title and references after the portfolio review. The argument concerns how to
  justify the checks governing delegated development. It reaches beyond Maze
  Duel, using the spectator correction only as a bounded illustration.
- Checked the [COMP8020 brief](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/assessments/final-project/#comp8020--critical-research-note)
  and its literature guidance. No earlier reading history has been reconstructed.
- Primary source record, inspected on 9 November 2026:
  - [Barr et al. (2015)](https://discovery.ucl.ac.uk/id/eprint/1471263/):
    journal metadata and full-text introduction; foundational scholarship.
  - [Alshahwan et al. (2024)](https://discovery.ucl.ac.uk/id/eprint/10199775/):
    FSE publication record and accepted manuscript, sections 2 and 4.
    Used the 73% acceptance figure; omitted the inconsistent aggregate yield
    figures in the abstract and body.
  - [Willison, Red/green TDD](https://simonwillison.net/guides/agentic-engineering-patterns/red-green-tdd/):
    living practitioner guide; cited as undated with an access date.
  - [Böckeler (27 May 2026)](https://martinfowler.com/articles/sensors-for-coding-agents.html):
    regression-sensor and mutation-testing sections; a practitioner experiment.
  - [Morris (4 March 2026)](https://martinfowler.com/articles/exploring-gen-ai/humans-and-agents.html):
    human oversight and harness-improvement sections; a practitioner proposal.
- Böckeler and Morris wrote the cited articles on MartinFowler.com; they are
  not attributed to Martin Fowler. The paper references link to accessible
  university records with full texts. DOI metadata was verified there, although
  the browser tool could not open the DOI resolver URLs directly.
- Limits preserved in the prose: older scholarship does not measure current
  agents; a bounded test-generation pipeline does not establish unrestricted
  autonomy; internal uptake is not a controlled production-defect comparison;
  practitioner observations are not representative benchmarks. The research
  note is a defended proposal, not evidence that this project's workflow has
  been proven optimal.
- Verification: the argument and complete document both fit 600–800 words;
  all five references render as links to the inspected primary pages, and the
  illustrative commit resolves locally. `git diff --check` and
  `pnpm check:evidence` passed. Application tests were not rerun; the evidence
  script does not evaluate the research argument or scholarly interpretation.

## Final portfolio review (2026-11-09)

- Current review: [docs/submission-review.md](submission-review.md). The six
  documents are locally complete, with a coherent Shared Space → local Maze
  Duel concept → implemented and corrected Maze Duel sequence. The earlier
  prototype date is the author's retrospective account; the implementation
  history starts on 1 November. Neither date was silently substituted for
  the other.
- The latest inspected public main was `7624af5`. This checkout is older, so
  describing its refusal-log leak as still open would misrepresent main.
  `fd1357c` supplies the implementation and regression evidence for the fix.
  Earlier open-issue notes remain historical observations, superseded by this
  review for current main.
- `dd1d890` adds useful process material: a rift correction improves route
  constraints while weakening comparisons across generator revisions, and
  camera persistence needed a change from sessionStorage to localStorage.
  PROCESS evaluates these consequences rather than merely adding features
  to its account. Saved layouts and shared ranking keys are separate concerns.
- Retained limits: seven levels lack switches; no follow-up friend evaluation
  establishes satisfaction; the original Crit 10 URL-only log exercise is not
  established. These are evidential limits, not prose gaps to fill by inference.
- Counts: README 591; PROCESS 1,096; research note 637 argument/728 total;
  reflections 282/285/292. All are within the published guidance. Thirty-three
  distinct commit objects support the six documents. Four evidence links in
  PROGRESS were corrected to their actual `docs/evidence/` paths.
- Main with the revised documents passed type checking and 145 tests in an
  isolated copy; the README's entire served text matched. The published repo
  was public with successful CI, but its PROCESS remained a placeholder and
  research-note.md and reflections/crit-10.md were missing. Local completeness
  is not yet submission completeness; preserve newer main records when
  integrating and publishing these files.

## Entry instructions clarification (2026-11-09)

- README now recommends a normal window for Player 1 and the invitation link
  in an incognito/private window for Player 2 when sharing one computer.
  It explains that normal windows in one browser profile share identity and
  that players on separate devices can use normal browsers.
- Tightened the audience and switch rationale without removing its trade-offs.
  The README is now 595 rendered words; its Play section was checked with the
  application's Markdown renderer. This is a local documentation change.

## Switch changed a friend's route (2026-11-09)

- Author report: in a race on the deployed game, the switch changed the
  friend's route. First human observation of the central claim ("another
  person's choices can change your route"). One informal race. The author
  later added: the friend flipped the switch themselves, in a quick-play race
  (Create a race, today's maze). Which switch and which route were not noted.
