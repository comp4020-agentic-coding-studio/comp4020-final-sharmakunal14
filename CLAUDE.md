# Harness

## Current project: Maze Duel

The project is moving from Shared Space to a two-player maze race. This first
playable version is deliberately limited to one verified maze, two browser
identities, ready-up, a shared countdown, live movement and one winner. Keep
the earlier Shared Space routes and data working during the transition.

### Race invariants

- The server owns positions, movement timing, the start timestamp and the
  winner. A client sends a direction and sequence, never a trusted position,
  elapsed time or victory claim.
- Exactly two distinct identities may occupy a race. Joining again must be
  idempotent; concurrent joins must not create a third seat. Check membership
  on every match read, stream, ready and movement endpoint.
- Reject moves before the countdown finishes, through walls, after the race
  ends, or faster than the common movement interval. A retried sequence must
  never move a player twice. Players pass through each other.
- Settle the first valid finishing move atomically. Server processing order
  breaks close finishes; do not claim this eliminates network-latency bias.
- Every passage in the fixed, rotationally symmetric maze must reach both
  entrances. Test this property rather than judging a rendered picture.
- At 390×844, keep the full maze and touch controls visible together during
  a race. Lobby-sized player cards pushed controls below the board in the
  first browser check; use a compact active-race layout. Keep the page heading
  available to assistive technology even when the visual introduction hides.
- Keep both player markers distinguishable when they share a cell; never hide
  a player under the other marker. Marker offsets must not change grid positions.
- A stream reconnect receives the complete saved state. Show disconnected
  status and disable local controls until a fresh snapshot arrives. During a
  browser disconnect the race clock continues; a server restart interrupts
  an active race without awarding a winner. Explain both behaviours in the UI.
- Commit accepted changes to SQLite before broadcasting them. Bound request
  bodies, stream counts and slow-reader buffers. Reject cross-site mutations;
  use session cookies and parameterized SQL. Never log session cookies.

### Scope and evidence

- No switches, power-ups, procedural generation, ranking or replay in this
  milestone. Add complexity only after two-browser playtesting.
- Add focused checks alongside behaviour changes: maze rules, authorization,
  concurrent joins and finishes, live delivery, retries and stored state.
- Work in small, meaningful commits. Update this harness when a discovered
  failure changes the rules; never invent process evidence or passing checks.
- The final README argument and PROCESS.md must be revised for Maze Duel by
  the author. Existing Shared Space prose is historical evidence, not evidence
  of testing the new game.

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
  written in PROCESS.md — the machine has 256 MB.
- A promise the app makes gets a check in `spec/` that runs against the running
  app. Write the check before or with the change, and watch it fail first.
- After any server change: run the app, then `pnpm check` against it. Report
  what actually ran; don't claim a check passed that wasn't run.
- SSE responses must write something immediately after headers (Node buffers
  headers until the first write — this broke the stream once).
- Server logs are JSON lines with an `action` and `outcome`; never log tokens,
  cookies or comment text.
- Commit in small, single-purpose units.
