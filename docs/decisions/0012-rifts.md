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

## Revision (2026-11-09): rifts were a free win in quick play
Playtest: the rift landed the player almost at the goal (the opponent's
entrance), making quick play too easy. In the daily maze (`riftLimit`), both
rift cells must now be at least `RIFT_DEPTH` (8) steps from the start, so
by symmetry the landing is as far from the goal. A rift may also save at most
a third of the route (`RIFT_MAX_SHARE`). About 7% of days now have no rift:
a plain maze rather than a free win. Levels keep their pinned layouts. Saved
races keep their saved rifts, but today's maze changes from the deploy on,
so today's best times mix the two layouts.

## Revision 2 (2026-11-09): hidden rift, one way into each goal
Playtest screenshot: the rift sat on the obvious corridor, and a gate beside
the opponent's entrance let a player slip in from the side. In quick play now:
- Each rift cell is at least `RIFT_HIDE` cell off the shortest walking route,
  in a side branch, so it has to be searched for.
- Each goal has one way in. A second opening is closed (with its 180°
  partner); if that cuts a pocket off, the pocket is reconnected through a
  symmetric wall away from both entrances.
- No switch gate or pulse lies within `ENTRANCE_GAP` (5) of an entrance.
Cost: about 12% of days (25/200 seeds) have no rift. The pinned 2026-11-01
gates moved on purpose; saved races keep their saved layout.
