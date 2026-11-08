# Harness

## Current project: Maze Duel

Maze Duel is a two-player maze race for friends. Shared Space, the earlier
prototype, stays reachable on its own routes; keep its routes and data working.

### What good means here (from README.md)

The README argues one idea; every rule below serves one of its three parts.
When a change does not serve any of them, it needs a reason in a decision
record before it is built.

| Part of good | Rules in this file | Checks in `spec/` |
| --- | --- | --- |
| **Another person's choices can change your route.** Switches flip gates for both players; layouts are symmetric and always passable. | Race invariants: switches, symmetry, reachability | `maze-game` (200-seed sweep over switch states), `maze-levels` |
| **The result is inspectable.** The server decides the winner; every accepted step is saved before it is shown; replays come only from saved data. | Race invariants: server authority, step log, commit before broadcast | `maze-http` (one winner, concurrent finish, replays), `maze-restart`, `maze-store` |
| **Losing does not stop you playing together again.** Rematch and Next level seat both players; a finished race unlocks the next level win or lose; watchers can follow. | Scope: progress, rematch, spectators | `maze-levels` (unlock win or lose), `maze-http` (rematch), `maze-spectate` |

Enjoyment, whether switches change route choices, and equal perceived
difficulty are judged with players, not checked. Report agent-driven browser
runs as such; never present them as playtests.

### Race invariants

- The server owns positions, movement timing, the start timestamp and the
  winner. A client sends a direction and sequence, never a trusted position,
  elapsed time or victory claim.
- Exactly two distinct identities may occupy a race. Joining again must be
  idempotent; concurrent joins must not create a third seat. Check membership
  on every match read, stream, ready and movement endpoint.
- Reject actions before the countdown finishes, through walls or closed
  gates, or after the race ends. Speed is a shared allowance: one step per
  140 ms on average, with at most four banked steps, so a slow connection can
  catch up instead of being capped by its round trip. A retried sequence must
  never apply an action twice; a batch applies in order and stops at the
  first refused action. Players pass through each other.
- A switch flips only for a racing player standing on it, at most once per
  1.5 s per switch, and never closes a gate on a player. Each switch opens one
  gate and closes another for both players at once.
- The browser may predict its own steps from the saved layout, but the server
  snapshot always wins: on any refusal it drops queued steps and redraws the
  server position. Queued steps are discarded on blur, hidden tab or
  disconnect, never sent later.
- Settle the first valid finishing move atomically. Server processing order
  breaks close finishes; do not claim this eliminates network-latency bias.
- Each race uses the maze generated from its Sydney date seed, and the
  generated layout, switches and gates are saved in the match so old races and
  replays never change. Layout, switches and gates are rotationally
  symmetric, and in every combination of switch states every open cell must
  reach both goals. Test this over many seeds rather than judging a picture.
- At 390×844, keep the full maze and touch controls visible together during
  a race. Lobby-sized player cards pushed controls below the board in the
  first browser check; use a compact active-race layout. Keep the page heading
  available to assistive technology even when the visual introduction hides.
- The race fills the browser window with CSS, never device full screen. Exiting
  full screen at the result resized the whole layout at once, which the player
  found jarring; `spec/maze-window-size.test.ts` keeps the Fullscreen API out.
- The 3D view is presentation only. Grid coordinates stay the authority, and
  avatar facing (1st/3rd person) is local and never sent to the server.
- In 1st/3rd person, forward walks the way the avatar faces; left, right and
  back only turn it. The map view keeps screen-absolute controls.
- The chase camera must stay above wall height. The first phone run put it
  inside a wall, showing only brick.
- Without WebGL, fall back to the 2D projected view; the game must stay
  playable.
- No two visible surfaces may share a plane. Offset decals at least 0.03
  above the floor, and use one mesh for a wall and its top. Coplanar ground,
  floor and overlapping wall caps once made the maze flicker whenever the
  camera moved. With reduced motion on, a still scene must render identically
  frame to frame.
- Keep both player markers distinguishable when they share a cell; never hide
  a player under the other marker. Marker offsets must not change grid positions.
- A stream reconnect receives the complete saved state. Show disconnected
  status and disable local controls until a fresh snapshot arrives. During a
  browser disconnect the race clock continues; a server restart interrupts
  an active race without awarding a winner. Explain both behaviours in the UI.
- Commit accepted changes to SQLite before broadcasting them. Bound request
  bodies, stream counts and slow-reader buffers. Reject cross-site mutations;
  use session cookies and parameterized SQL. Never log session cookies.
- Every accepted action is written to the step log in the same transaction as
  the match state. Replays and best times come only from saved server data,
  never from client clocks.

### Scope and evidence

- Audio is presentation (decisions 0005 and 0006): original synthesized
  retro-platformer sounds. It is ON by default and continuous: music plays in
  the lobby, the waiting room and the race, with a short fanfare on the
  result. Browsers refuse sound until a click or key press, so the first
  gesture unlocks it. Offer a visible mute button in the top bar at all
  times, and independent music control. Never block gameplay when audio or
  preference storage is unavailable.
- Audio must be audible, not just scheduled. A passing scheduling test has
  already shipped a game whose sounds peaked at 0.04 (inaudible on a laptop).
  Measure the signal reaching the speakers; keep effects at peak 0.25 or more
  and music clearly present, but under the effects.
- Page navigations drop audio permission (creating a race reloads the page).
  The new page must retry the unlock when the visitor has already interacted,
  and fall back to the next click. Test the waiting room after a real
  navigation, not only in-page.
- Never copy a real game's melody or recordings. Write original tunes in the
  same style (bright square lead, triangle bass, noise percussion, coin and
  jump blips).
- Walking sounds may follow prediction; shared flips and results require a
  newer server snapshot. Do not double-play HTTP/SSE duplicates or replay old
  events when reconnecting. Keep replays silent and all visual feedback intact.
- Bound audio voices and scheduling; silence hidden pages, mute and disconnected
  races, and dispose on page exit. Verify lifecycle and duplicate handling;
  report human listening separately from automated audio checks.
- Check the sound menu during an active phone-sized race, not just the lobby.
  The race header must retain its positioned stacking layer: `position: static`
  put the sound controls behind the stage in the first audio browser check.
- Gameplay shortcuts must ignore focused sound controls, including `<summary>`:
  Space opens the disclosure without flipping a gate. Keep this regression in
  the control tests when adding other keyboard-operable UI.

- The first-playable runtime and its known trade-offs are recorded in
  `docs/decisions/0002-maze-duel-first-playable.md`; milestone 2 scope in
  `docs/decisions/0003-shared-maze-mechanics.md`. The raised view is Canvas
  2D; 0004 replaces it with a vendored Three.js 3D view. Do not promise
  latency-neutral racing.
- One switch mechanic plus the timed pulse gates (decision 0010). A closed pulse gate is a wall; the server times it from `startsAt` with its own clock and the browser only predicts. Pulses keep their own seed stream so existing dates never change. Power-ups, map reveals, live footprint trails
  and accounts stay out of scope: each adds unpredictability without making
  the opponent's choices matter more. Cameras are fixed views (map, 3rd,
  1st), not free-roam movement.
- Levels (decision 0013) are fixed data in `public/maze-levels.js`; every level
  must pass the same fairness and reachability checks as the daily maze and
  contain the mechanics it names, and its layout fingerprint is pinned. If a
  generator change moves a fingerprint, that changes a level everyone has
  played: say so and update the pin on purpose. The daily maze must stay
  byte-identical (compare against the previous generator, not a picture).
  The daily maze was deliberately changed twice on 2026-11-09 (decision 0012
  revisions 1 and 2), each from a playtest: a deep rift entrance and capped
  saving, then a rift hidden off the shortest route, one way into each goal
  and no gate beside an entrance. A rift or side door that hands out a free
  win breaks "another person's choices change your route"; any other change
  still needs a stated reason.
- Progress is derived from finished races (win or lose), never stored; a
  forfeit unlocks nothing. Rematch and Next level share one link: whoever
  asks first decides, so both players always land in the same race.
- Avatar looks and chat are presentation (decision 0007). A look is fixed
  names plus an integer hue, validated by the server and locked once the
  countdown starts; it never affects the rules. Chat shows only the two
  players' lines, is rate-limited, and is drawn with `textContent`, never HTML.
  The win celebration is client-only, winner-only, live-only, and a still
  banner under reduced motion.
- Spectators (decision 0008) hold a separate random token, never the race id. The token follows the rematch chain to the newest race; non-players get only `rematched: true`, never the new id.
  The race id is the invitation (it opens `/join`), so nothing a spectator or
  outsider receives may contain it: `publicGame` drops `id` and gives an opaque
  `race` key. A test once asserted the id *was* exposed, locking the hole in;
  when a test encodes a promise, check the promise, not the current output.
  They read and stream only: no join, ready, move, chat or rematch. Remove
  private fields (`publicGame`) from anything a non-player receives, and keep
  spectator limits separate from player stream limits. A streak is derived
  from saved matches in Sydney days; do not store it.
- When writing regexes with `\u` escapes through a script, check the file: the
  escapes were once written as raw invisible characters (including U+2028),
  which broke the file. `node --check` and `pnpm typecheck` catch it.
- Every browser module must parse. `spec/browser-modules.test.ts` exists
  because a corrupted `maze-race.js` passed every HTTP check while blanking
  the page.
- Add focused checks alongside behaviour changes: maze rules, authorization,
  concurrent joins and finishes, live delivery, retries and stored state.
- Work in small, meaningful commits. Update this harness when a discovered
  failure changes the rules; never invent process evidence or passing checks.
- The final README argument and PROCESS.md must be revised for Maze Duel by
  the author. Existing Shared Space prose is historical evidence, not evidence
  of testing the new game.

### Design and progress records

- Keep `docs/design.md` accurate about the current scope, architecture, state
  transitions, security boundaries and known trade-offs. For a consequential
  choice, add or update a numbered record in `docs/decisions/` with context,
  alternatives, rationale, consequences and an explicit status. Link a
  replacement when a decision is superseded; preserve the earlier reasoning.
- Update `PROGRESS.md` during each meaningful work session or milestone and
  before handing the task back. Record completed changes, observed problems,
  corrections, verification results, limitations and outstanding work. Small
  related commits may share one concise progress entry.
- Date entries in Australia/Sydney time. Cite real local commits once they
  exist, and distinguish local commits from pushed work. Record the actual
  deployment outcome; do not imply that local verification covers production.
- Keep proposed work separate from completed work. State which checks ran,
  which could not run and why. Identify agent-driven browser checks separately
  from human playtests. Never reconstruct missing evidence as a claimed result
  or include credentials, session cookies or sensitive player data.
- Keep `docs/writing-notes.md` current: raw material for the author's README
  and PROCESS.md (facts, decisions with reasons, evidence, open questions,
  candidate sources). Notes, not finished prose to paste in.
- Link significant corrections to their rule or regression check. Use the
  design records and progress log as evidence for the author's later assessed
  `PROCESS.md`, without silently replacing that reflection with a work log.

## Earlier prototype: Shared Space

These rules continue to apply to the retained event-layout routes.

## Product rules

- Never overwrite someone else's saved move. Every change to an object carries
  the version it was based on; the server refuses a stale one (409) and the
  interface shows where the object actually is.
- Invalid layouts are allowed in a draft. A clash is reported as a problem with
  the objects and distances named, never blocked silently or hidden.
- "Saved" means committed to SQLite on the `/data` volume. Don't show a change
  as saved before the server confirms it.
- Every action that works by dragging also works by keyboard and by buttons or
  fields. No feature ships drag-only.
- Remote updates must not steal focus, clear an input being typed in, or reset
  the selection.
- A drag in progress is shown to others as a preview, never saved. Previews and
  presence are SSE named events without an `id:`, so they are never replayed;
  only saved changes carry the history seq.
- A preview carries the version it was based on; one that no longer matches is
  refused so a stale ghost never reappears.
- The page must recover from a closed stream by itself and resume after the
  last applied seq. The machine stops when idle, so a restart is normal.

## How to work

- Stack: Node 24 running `server.ts` directly, built-in `node:sqlite`, plain
  HTML/CSS/JS in `public/`. No framework or runtime dependency without a reason
  written in PROCESS.md — the machine has 256 MB. Three.js is vendored as one
  pinned file in `public/vendor/` (decision 0004), served gzipped and immutable.
- A promise the app makes gets a check in `spec/` that runs against the running
  app. Write the check before or with the change, and watch it fail first.
- After any server change: restart the app (or run the new code on another
  port with `APP_URL`), then `pnpm check` against it. A check that found an
  old server on 8080 once passed vacuously. A test that may skip must not be
  the only evidence for a feature. Report
  what actually ran; don't claim a check passed that wasn't run.
- SSE responses must write something immediately after headers (Node buffers
  headers until the first write — this broke the stream once).
- Server logs are JSON lines with an `action` and `outcome`; never log tokens,
  cookies or comment text. Every maze action and refusal is logged (`maze.*`)
  with the actor id and the first eight characters of the race id, never the
  full id (it is the invitation), nicknames or chat text. `spec/maze-logs.test.ts`
  reads a real server's output to enforce this.
- Do not reuse a module-level name inside a function in browser code: a
  shadowed formatter once threw inside a `try/catch` and silently hid a result
  note. Errors swallowed for "bonus" UI still need a test that the UI appears.
- Commit in small, single-purpose units.
