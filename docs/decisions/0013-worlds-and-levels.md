# 0013 Worlds: twelve fixed levels beside the daily maze

Status: accepted (2026-11-03)

## Context
The author's "Rift Runners" brief proposed four worlds of three levels, each
world teaching a new way of thinking. Pulse gates (0010), fog (0011) and rifts
(0012) now exist, so a campaign can be built from them. The author approved
the plan and chose "finishing a level unlocks the next" over "winning".

## Decision
- Twelve levels in four worlds. A level is fixed data: id, name, world, maze
  size, seed and the mechanics it enables. The same level is always the same
  maze, so times on it are comparable.

  | World | Levels (size · mechanics) |
  | --- | --- |
  | 1 Forgotten Gardens | 9×9 plain · 11×11 plain · 13×13 fog |
  | 2 Temple of Choices | 11×11 switches · 13×13 switches · 13×13 switches + pulse |
  | 3 Clockwork Citadel | 13×13 pulse · 13×13 two pulse pairs, different rhythms · 15×15 pulse + switches |
  | 4 Fractured Dimension | 13×13 rifts · 15×15 rifts + pulse · 15×15 everything + fog |

- The daily maze is unchanged and stays the default. A race is either daily
  (`level` absent) or a level race (`level: "1-1"` … `"4-3"`).
- The generator takes the size and mechanic list. Every level is checked like
  the daily maze: symmetric, every cell reaches both goals in every switch
  state, equal routes, and its mechanics are actually present.
- Progress is derived from saved races, like the streak: a level is complete
  for a player once they took part in a race on it that finished (win or
  lose). 1-1 is always open; completing a level opens the next. Not stored.
- Only the creator needs the level unlocked; an invited player can join any
  level (the brief: "join a friend's unlocked stage").
- Rematches keep the level. A finished level race offers "Next level", which
  creates a new race on the next level with the same invitation flow.
- Each world has its own colours for walls, floor and sky in 3D and 2D.
  Presentation only.
- Best times are per level (the maze id is the level's id).

## Alternatives
- Unlock by winning only: the weaker player gets stuck (brief, section 5).
- Twelve random daily-style mazes: no learning curve, no comparable times.
- Building footprints, a rotating chamber, two floors and shifting walls: each
  is a large mechanic with its own fairness proof; replaced in this version by
  combinations of the existing ones (listed above). Can be added later.

## Consequences
- Level layouts are generated from seeds at runtime, so changing the
  generator could change a level. A test pins a fingerprint of every level.
- "Complete" counts a cancelled race? No: only `finished` races count, so a
  forfeit does not unlock anything.
