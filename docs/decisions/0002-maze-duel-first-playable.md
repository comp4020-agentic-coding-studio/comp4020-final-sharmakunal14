# Maze Duel: first playable scope and runtime

Date: 1 November 2026. Status: implemented locally; not deployed in this step.

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

## Verification on 1 November

- `pnpm check`: TypeScript passed; 32 tests passed across eight files. This
  includes the 15 retained Shared Space/starter checks, HTTP access and input
  validation, concurrent joins/finishes, streaming, stored results, a real
  server-process restart, and focused keyboard-input checks.
- `pnpm check:evidence`: passed; both existing crit reflections were found and
  all ten cited historical commits resolved. This is structural verification,
  not evidence that the old process narrative describes Maze Duel.
- `node --check` passed for all five new browser modules; `git diff --check`
  passed for the implementation changes.
- An agent-driven browser race used separate Chrome and in-app-browser cookie
  stores. Nickname creation, invitation joining, readiness, countdown, a
  movement-button press, keyboard movement, a full finish and result reload
  were exercised. Both players saw the same winner.
- The active-race interface was inspected at 1920×1080 and 390×844. This used
  desktop browser viewport emulation, not a physical phone. No console errors
  or warnings were reported in the inspected Chrome session.

Docker and TruffleHog were not available locally, so the container build and
CI secret scans were not run. No deployment or independent human playtest was
performed. The author still needs to revise the assessed README argument,
PROCESS.md and, if enrolled in COMP8020, the research note.
