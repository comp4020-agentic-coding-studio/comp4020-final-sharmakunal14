# Maze Duel design

Last updated: 1 November 2026. Scope: shared maze mechanics, 3D presentation
and retro audio (decisions 0003–0006).

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
create another race. Milestone 2 adds:
- a daily seeded 15×15 maze;
- one switch per side, each opening one gate and closing another for both players;
- client-side prediction with batched commands;
- a server step log, today's best times and replays.

Accounts, power-ups, map reveals and a free 3D camera stay deferred.

## Architecture

| Component | Responsibility |
| --- | --- |
| `server.ts` | HTTP entry point, browser identity, static pages and integration with the retained Shared Space app. |
| `maze-gen.ts` | Deterministic symmetric maze, switch and gate generation from a date seed. |
| `maze-game.ts` | Player membership and pure state transitions for readiness, batched actions (steps and flips), the speed allowance and results. |
| `public/maze-rules.js` | Passability and gate rules shared by the server (authority) and the browser (prediction). |
| `maze-store.ts` | Transactional SQLite snapshots, the step log (`maze_steps`), results (`maze_results`), best times and restart handling. |
| `maze-http.ts` | Validated commands, access checks and API responses. |
| `maze-live.ts` | SSE snapshots, presence, timed transitions and stream limits. |
| `public/maze-3d.js`, `public/maze-views.js` | Three.js scene, cameras, avatar animation and the camera switcher. |
| `public/maze-audio.js`, `maze-audio-events.js`, `maze-audio-ui.js` | Original Web Audio synthesis, confirmed-state cue policy, and optional local sound/music settings. |
| `public/maze*.js`, `public/maze-ui.css`, `public/maze.html` | Lobby, HUD, live state, controls and responsive layout; `maze-render.js` is the 2D fallback. |
| `public/vendor/` | Pinned third-party browser code (Three.js r170, MIT). |
| `spec/maze-*` | Rule, persistence, HTTP, restart and input regression checks. |

The existing Node 24, SQLite and plain browser JavaScript stack is retained.
Commands travel over HTTP; updates travel over SSE. SQLite commits precede
broadcasts. Reconnecting streams receive a complete authoritative snapshot.
There is no new runtime dependency or separate database service.

Rendering uses Three.js, vendored as one file
([decision 0004](decisions/0004-three-dimensional-view.md)):
- a sunlit desert maze with brick walls, energy-field gates, crystal switches
  and avatars;
- three cameras: an orbitable map, a third-person chase view and first person.

The server operates on grid coordinates independently of the visual scene;
avatar facing is local presentation. Without WebGL, the earlier Canvas 2D
projection is used instead. Shared Space remains available at `/shared-space/`,
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
- Each Sydney day has one generated 15×15 maze, saved into every match made
  that day. Layout, switches and gates are rotationally symmetric.
- Gates occupy base-maze walls, so opening one only adds a passage. In all
  four switch states, every open cell reaches both goals; a 200-seed sweep
  checks this.
- A flip cannot close a gate on a player, and each switch has a 1.5 s cooldown.
- A daily maze can be memorised within the day. That is accepted, because it
  makes times comparable.
- Speed is an allowance: one step per 140 ms on average, with at most four
  steps saved up.
- The browser sends up to eight actions per request with one request in
  flight, and predicts locally. A refusal returns the authoritative snapshot
  and drops any predictions built on the refused action.
- Each accepted action is written to `maze_steps` in the same transaction as
  the match. A finished race also writes one `maze_results` row.
- A finished race's replay is readable by any signed-in visitor; an
  unfinished race remains private to its two players.
- At 390×844, the active maze and directional controls must fit together. Keep
  both markers visible when they share a cell and preserve the page heading
  for assistive technology. The spatial game still requires visual navigation.

## Trade-offs and open questions

Full snapshots simplify recovery but transfer more data than deltas. Batched
commands keep average speed constant up to about a 560 ms round trip; queued
input is discarded on blur or disconnect rather than sent late. Server processing order
settles close finishes; there is no latency compensation.

Independent playtesting should establish whether newcomers can join and start
from the URL alone, identify their goal, use the controls and understand the
result. Physical-phone usability, sustained load and deployed network behaviour
remain unverified. Retention of old races and stronger identity/abuse controls
need a decision before the prototype is used at a broader scale.

Switches are implemented as optional shortcuts over a connected base maze,
which meets the earlier requirement that every player keep access to their
goal from wherever they stand. It is not yet known whether players face a
real dilemma. Each player's own switch is nearer them, so flipping may simply
be always correct. That needs human playtesting before more mechanics.

## Decision index

- [0001: Refuse outdated moves](decisions/0001-refuse-outdated-moves.md) — historical Shared Space decision.
- [0002: First playable scope and runtime](decisions/0002-maze-duel-first-playable.md) — implemented Maze Duel decisions and costs; partly amended by 0003.
- [0003: Shared maze mechanics](decisions/0003-shared-maze-mechanics.md) — daily seed, switches, batching, step log and replays.
- [0004: Real 3D view](decisions/0004-three-dimensional-view.md) — vendored Three.js, map/3rd/1st cameras, turn-to-walk controls, glass HUD.
- [0005: Optional original retro audio](decisions/0005-retro-audio.md) — synthesized chiptunes, gesture unlock, bounded scheduling and confirmed-event feedback; partly amended by 0006.
- [0006: Audible, on-by-default audio](decisions/0006-audible-retro-audio.md) — louder levels, per-scene music, mute button, page-load unlock.

For future changes, update this overview when behaviour or architecture changes.
Add a numbered decision record for a consequential choice, including context,
alternatives, rationale, costs and status. Mark a superseded decision and link
its replacement instead of silently rewriting the historical choice.

## Audio presentation

Sound defaults on ([0006](decisions/0006-audible-retro-audio.md)) and waits for
the first click or key press, which browsers require. A visible mute button and
the M key (ignored while typing) toggle it; a keyboard-accessible menu has
separate sound and music checkboxes. Only these preferences are stored, in
`maze-duel-audio-v1` local storage; no player or race data is added. Malformed
or blocked storage falls back safely. A missing or denied AudioContext shows a
local notice and does not prevent playing. The server/API, permissions,
persistence and dependencies are unchanged by audio.

One AudioContext is created or resumed from a gesture, and retried when a new
page loads after the visitor has already interacted (creating a race reloads
the page). Effects are square and triangle tones with slides, vibrato and
envelopes. Music is a square lead, triangle bass and noise drums, in four
original tunes (lobby, waiting room, countdown, race) chosen from the game
state. A result stops the music for its jingle. The voice budget is 40; one 80
ms scheduler looks up to 200 ms ahead and skips missed beats after a stall.
Repeated effects are rate-limited, and mute and hidden-page handling stop
voices and timers; page exit closes the context. Loudness is measured from the
real output in Chrome and guarded by `spec/maze-audio-levels.test.ts`. These are scheduling bounds,
not a claim about measured CPU, battery consumption or perceived loudness.

Walking and turning match local predicted presentation; a later refusal may
correct the position after its step sound. Flip/ready/start/result cues compare
newer confirmed revisions, so an HTTP response and SSE snapshot cannot sound the
same transition twice. Initial and reconnect snapshots establish silent baselines.
Countdown ticks follow the current displayed second. A finish stops accompaniment
and selects a winner, loser or interruption phrase. Camera changes have a short
cue; replay playback deliberately adds none. Dropped/cancelled transitions between
snapshots are not reconstructed. Human listening must judge timbre, music fatigue
and whether cues help players; tests do not settle those questions.
