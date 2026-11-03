# 0012 Rifts: a symmetric pair of linked portals

Status: accepted (2026-11-02)

## Context
The brief's "Portal Paradox" level teleports players between distant regions.
The code already calls the two entrances "portals", so these are called
**rifts** in code and UI to avoid confusion.

## Decision
- Each daily maze gets one linked pair of rifts on open cells, at 180°
  rotational positions of each other (so the pair is its own mirror image and
  fairness holds automatically). Both are away from the entrances, switches
  and gate cells.
- Stepping onto a rift moves the player to the other rift in the same server
  step. It is one step for speed purposes. The step log records the arrival
  cell with `kind: "rift"`, so replays and best times stay server-derived.
- Arriving on a rift does not teleport again; you must step off and back on.
- Rifts are chosen only where they save at least 4 steps on the shortest
  route, so they matter; they use their own seed stream, like pulses.
- Reachability is unaffected (a rift only adds an edge); the sweep still
  passes, and a new sweep checks both players have equal shortest routes with
  rifts included.
- The browser predicts the jump; the 3D view snaps the avatar (no slide
  across walls) and shows a flash.

## Alternatives
- Several rift pairs: harder to read; start with one.
- Rifts that cycle like pulse gates: two timed mechanics at once is too much
  for a first version.

## Consequences
- The step log gains a new `kind`. Old replays have none and play as before.
- Teleporting can confuse 1st-person orientation; the avatar keeps its facing.
