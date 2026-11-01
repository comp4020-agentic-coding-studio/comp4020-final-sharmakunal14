# Writing notes for README.md and PROCESS.md

Raw material for the author. These are notes, not prose to paste in: the
brief asks for README.md and PROCESS.md to be written by you, in your own
voice. Every claim below points at something checkable. Keep it updated.

Targets: README 400–600 words, published at `/readme/`. PROCESS.md
900–1100 words, rewritten rather than appended. Due Mon 9 Nov 2026, 12:00.

---

## README: what "good" could mean for Maze Duel

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
- All browser checks so far were agent-driven, with emulated phone and
  latency. There have been no human playtests yet.
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
