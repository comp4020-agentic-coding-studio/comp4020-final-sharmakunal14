# Maze Duel: first playable scope and runtime

Date: 1 November 2026. Status: implemented. The fixed maze, one-command-in-flight and "no switches/ranking/replay" decisions are amended by [0003](0003-shared-maze-mechanics.md); the rest stands.

## Context

The project direction changed from Shared Space to a two-player maze race.
The final-project checkout already had a working Node 24 HTTP server, SQLite
database, SSE transport, browser JavaScript and a 256 MB Fly.io configuration.
The requested milestone was a lobby, countdown, one verified maze, live
movement and a server-decided winner. Earlier routes, data and reflections
are retained so the transition does not erase earlier course work.

## Decisions

- Retain Node, SQLite and SSE. Use small HTTP movement commands and complete
  SSE snapshots. WebSockets were an alternative, but are not necessary to
  demonstrate this grid-based interaction. Full snapshots simplify reconnect
  recovery; their cost is more bytes than movement-only deltas.
- Use a fixed Canvas 2D projection with raised wall faces. This keeps keyboard
  directions aligned with the screen and avoids a new rendering dependency.
  It is not the initially discussed first-person or free-camera 3D experience.
- Verify one rotationally symmetric maze rather than generate new ones.
  This controls scope and supports repeatable tests, but repeated play allows
  route memorisation. Symmetry and equal distance do not prove perceived fairness.
- Commit accepted moves before publishing. Sequence numbers prevent a replayed
  command from moving a player twice. The server arbitrates the first accepted
  finishing move in a transaction; there is no latency compensation.
- Permit one browser command in flight. This bounds input buffering and avoids
  stale held-key actions after reconnection, at the cost of slower effective
  movement over high-latency connections.
- Browser disconnects do not pause the clock. A process restart interrupts an
  active race without assigning a winner; completed results survive. This is
  intentionally simpler than resuming timed competition across an outage.

## Changes prompted by browser checks

At 390×844, the first active-race layout placed touch controls too far below
the board. A compact race layout now keeps both in view. The corresponding
constraint was added to `CLAUDE.md` with the fix. The same browser run exposed
overlapping player markers at a shared cell; visual offsets now distinguish
both players without changing the server's grid coordinates.

## Implementation and verification record

The [initial implementation entry in PROGRESS.md](../../PROGRESS.md) records
the completed work, all 19 implementation commits, automated results,
agent-driven browser checks and verification limits. Keep subsequent work
and check results there so this decision record remains focused on the
choice and its consequences.

The [current design overview](../design.md) maps these decisions to components,
race states, trust boundaries and open questions. Changes to these decisions
should explicitly amend or supersede this record, rather than treating an
unimplemented proposal as the current design.
