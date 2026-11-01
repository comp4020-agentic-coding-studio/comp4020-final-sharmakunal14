# Harness

## Current project: Maze Duel

The project is moving from Shared Space to a two-player maze race. The first
playable version proved the race loop (two identities, ready-up, countdown,
live movement, one winner). Milestone 2 (decision 0003) makes the shared maze
matter: a daily seeded layout, switches that open one gate and close another
for both players, latency-tolerant movement, per-maze best times and replays.
Keep the earlier Shared Space routes and data working during the transition.

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

- The first-playable runtime and its known trade-offs are recorded in
  `docs/decisions/0002-maze-duel-first-playable.md`; milestone 2 scope in
  `docs/decisions/0003-shared-maze-mechanics.md`. The raised view is Canvas
  2D; do not describe it as a full 3D engine or promise latency-neutral racing.
- One switch mechanic only. Power-ups, map reveals, live footprint trails,
  accounts and a free 3D camera stay out of scope: each adds unpredictability
  without making the opponent's choices matter more.
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
