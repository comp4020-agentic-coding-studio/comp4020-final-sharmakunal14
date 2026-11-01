# Maze Duel design

Last updated: 1 November 2026. Scope: the first playable version.

This file describes the current design. Important choices and their alternatives
belong in [decision records](decisions/0002-maze-duel-first-playable.md).
[PROGRESS.md](../PROGRESS.md) records completed work, checks and outstanding
items. Proposed changes below are not implemented features.

## Purpose and scope

Two people in separate browser sessions race across the same maze from opposite
entrances. Each tries to reach the other's starting point. A shared countdown,
visible opponent and one server-decided result establish the basic competition.

The first milestone tests whether that interaction works reliably. Whether it
is enjoyable, understandable without explanation and perceived as fair remains
a question for independent playtesting.

Included: nicknames, invitations, two seats, ready-up, live positions, keyboard
and directional-button controls, saved match state and results, and a way to
create another race. Switches, procedural generation, ranking, accounts and
animated replays are deferred.

## Architecture

| Component | Responsibility |
| --- | --- |
| `server.ts` | HTTP entry point, browser identity, static pages and integration with the retained Shared Space app. |
| `maze-game.ts` | Fixed maze, player membership and pure state transitions for readiness, movement and results. |
| `maze-store.ts` | Transactional SQLite snapshots and restart handling. |
| `maze-http.ts` | Validated commands, access checks and API responses. |
| `maze-live.ts` | SSE snapshots, presence, timed transitions and stream limits. |
| `public/maze*.js`, `public/maze*.css`, `public/maze.html` | Lobby, rendering, live state, controls and responsive layout. |
| `spec/maze-*` | Rule, persistence, HTTP, restart and input regression checks. |

The existing Node 24, SQLite and plain browser JavaScript stack is retained.
Commands travel over HTTP; updates travel over SSE. SQLite commits precede
broadcasts. Reconnecting streams receive a complete authoritative snapshot.
There is no new runtime dependency or separate database service.

The rendering is a fixed Canvas 2D projection with raised wall faces. It is
not a WebGL engine. The server operates on grid coordinates independently of
the visual projection. Shared Space remains available at `/shared-space/`,
with its earlier data and tests retained.

## Race lifecycle

| State | Behaviour and transition |
| --- | --- |
| Waiting | The creator occupies A; another identity can join B. Joining again does not allocate another seat. Two ready players trigger the countdown. |
| Countdown | The server assigns a start time three seconds ahead. No movement is accepted before the start. |
| Racing | Valid steps update saved positions. Players can pass through one another. The first accepted finishing move ends the race. |
| Finished | The winner and finish time are saved. Further commands cannot advance either player. Creating another race produces a separate invitation. |
| Interrupted | A server restart during countdown/racing, or the ten-minute race limit, ends the match without a winner. Last saved positions remain available. |

A browser disconnect does not pause the clock. Rejoining with the same cookie
restores access to that player's position. Clearing the cookie loses that
identity; repeating its nickname does not recover it.

## Correctness, security and presentation

- The server owns positions, timing and the winner. Clients submit a direction
  and sequence number, not a trusted position or victory claim. The minimum
  interval between accepted steps is 140 ms. Repeating the latest accepted
  sequence does not move the player again; older or out-of-order sequences fail.
- Exactly two identities can occupy a match. Membership is checked on reads,
  streams and player actions. An unused invitation allows someone to take the
  second seat; it is not an account-based invitation to a verified person.
- Mutations require JSON and reject cross-site requests. Match commands have
  bounded bodies; SQL uses parameters. Stream counts and slow-reader buffers
  are bounded. These controls are not a claim of comprehensive abuse resistance.
- The 13×13 maze is fixed and rotationally symmetric. Every passage is checked
  for reachability. Repeated play permits route memorisation; equal distance
  and symmetry do not establish equal perceived difficulty.
- At 390×844, the active maze and directional controls must fit together. Keep
  both markers visible when they share a cell and preserve the page heading
  for assistive technology. The spatial game still requires visual navigation.

## Trade-offs and open questions

Full snapshots simplify recovery but transfer more data than deltas. One
movement request in flight avoids queued actions after a disconnect, but slows
effective movement on higher-latency connections. Server processing order
settles close finishes; there is no latency compensation.

Independent playtesting should establish whether newcomers can join and start
from the URL alone, identify their goal, use the controls and understand the
result. Physical-phone usability, sustained load and deployed network behaviour
remain unverified. Retention of old races and stronger identity/abuse controls
need a decision before the prototype is used at a broader scale.

If shared switches are considered later, their design must preserve access
from each player's current position to their goal. Merely keeping the two
entrances connected is insufficient. Opening optional shortcuts is a proposed
direction, not a committed implementation for the next milestone.

## Decision index

- [0001: Refuse outdated moves](decisions/0001-refuse-outdated-moves.md) — historical Shared Space decision.
- [0002: First playable scope and runtime](decisions/0002-maze-duel-first-playable.md) — implemented Maze Duel decisions and costs.

For future changes, update this overview when behaviour or architecture changes.
Add a numbered decision record for a consequential choice, including context,
alternatives, rationale, costs and status. Mark a superseded decision and link
its replacement instead of silently rewriting the historical choice.
