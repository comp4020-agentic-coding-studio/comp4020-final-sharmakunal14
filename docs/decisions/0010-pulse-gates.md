# 0010 Pulse gates: the maze moves on its own clock

Status: accepted (2026-11-02)

## Context
A design brief for a 12-level "Rift Runners" campaign proposed many new
mechanics: fog, a reveal ability, footprint trails, timed gates, rotating
rooms, portals, two floors, ghosts, cosmetics and a 3D trophy hall. Switches
already let one player change the other's route. What is missing is a maze
that changes without either player, so that reading its timing becomes a skill
and a shortcut becomes a gamble.

## Decision
- Each daily maze gets one rotationally symmetric pair of **pulse gates**.
  They are base walls whose opening shortens the route by at least two steps,
  kept away from the switch gates and both entrances.
- A pulse gate is open for 2.5 s, then closed for 2.5 s, measured from the
  race start (`startsAt`). Both gates of the pair share the phase, so neither
  player gets a better timing.
- The timing is saved with each gate (`openMs`, `closedMs`) in the match, so
  old races and replays never change if the constants change later.
- The server decides with its own clock. The browser predicts from its
  estimate of server time; a refusal resets it like any other refused step.
- A closed pulse gate only removes a passage, so every cell still reaches
  both goals. A gate closing on a player does not trap them: movement checks
  only the target cell, so they can step out.
- In the last 0.7 s before closing, the gate flickers as a warning.
- Pulses use their own seeded random stream (`mazeId + ":pulse"`), so the
  maze, switches and gates for any date are unchanged and today's best times
  stay comparable.

## Alternatives
- Rotating chamber: more spectacular, but it moves cells, which breaks the
  "grid coordinates are authority, walls never move under a player" model and
  the many-seed reachability proof gets much harder.
- Portals: good, but teleporting makes the 1st/3rd person camera jump and
  needs new replay drawing. A candidate for a later step.
- Pulse ability, footprint trails: still out of scope (see CLAUDE.md), they
  add information without making the opponent's choices matter more.
- Pausing the clock when both players disconnect: conflicts with the current
  rule that the race clock keeps running.

## Consequences
- `passable` now takes an optional server time; without one, pulse gates
  count as closed (the conservative answer for the reachability test).
- Close to a transition, a prediction can disagree with the server by the
  clock-estimate error; the snapshot wins. Not latency-neutral.
- Races created before this change have no pulse gates and play as before.
