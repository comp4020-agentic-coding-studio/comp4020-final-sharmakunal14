# 0011 Fog: an optional race setting that limits sight

Status: accepted (2026-11-02)

## Context
After pulse gates, the author asked for fog and portals. Fog appears in the
"Rift Runners" brief as "Into the Mist". Its value is that it makes route
memory and landmarks matter, without changing the rules.

## Decision
- The creator chooses **Clear** or **Fog** when creating a race. The choice is
  saved in the match (`fog: true`) and carried into rematches. A joining player
  sees it in the waiting room before readying.
- Fog is presentation. The server sends the same state either way; positions,
  movement and the winner are unaffected, and a curious player could read the
  full layout from the API. This is a difficulty setting between friends, not
  hidden information.
- During the race, each player sees only cells within 3 steps (straight-line
  grid distance) of themselves. In 3D, distance fog plus a dark cover over
  unseen cells; in the 2D fallback, unseen tiles are drawn as cloud.
- The map camera is still allowed, but in fog it shows only what is near you.
  Portals, switches and gates beyond sight are hidden; the goal portal beam
  stays visible as a landmark (the brief's "glowing landmarks").
- Spectators and replays see everything.
- Best times are shared across clear and fog races for the same maze for now;
  the leaderboard marks fog runs with a label.

## Alternatives
- Server-side hiding (send only nearby cells): real secrecy, but it breaks
  client prediction, the reconnect snapshot and replays. Too costly for a
  friendly setting.
- Fog always on for some days: removes player choice and makes daily times
  incomparable across days.

## Consequences
- Not secure against a player who reads the network tab; documented above.
- Fog runs are probably slower, so mixing them in one leaderboard is unfair to
  fog runners; marked, not separated. Revisit after playtesting.
