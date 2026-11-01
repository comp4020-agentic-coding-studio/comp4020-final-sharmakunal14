# Maze Duel: shared maze mechanics (milestone 2)

Date: 1 November 2026. Status: accepted; implementation in progress.
Amends [0002](0002-maze-duel-first-playable.md) (fixed maze, one command in
flight, no switches/ranking/replay). The 0002 reasoning is kept as history.

## Context

An audit of the first playable version found:

1. **One fixed maze.** The 13×13 layout had a 24-step shortest route. After one
   race both players knew the answer, so later races measured key speed only.
2. **No interaction.** Players could not affect each other. "Multi-user" meant
   seeing a second dot move, not sharing a space.
3. **Lag decided speed.** The browser sent one step at a time and waited for
   the reply, so a step took the larger of 150 ms and the round-trip time. At
   250 ms of lag a player moved about 40% slower. The assessment's top band
   asks how the app copes with slow connections.
4. **Thin persistence.** Recent races showed only a status: no winner, time,
   ranking or way to look back at a race.

## Decisions

- **Daily seeded maze.** Each Sydney calendar day gets one generated 15×15
  maze, made from the date as its seed. Everyone races the same maze that day,
  so best times can be compared, and tomorrow brings a new one. The generated
  layout is saved inside each match, so old races and replays never change.
  - Alternative: a new random maze per race. Rejected because times would not
    be comparable and no leaderboard would be meaningful.
- **Switches and gates as the one mechanic.**
  - Each player's half has one switch. Flipping it opens one gate and closes
    another, for both players at once.
  - Gates sit on cells that are walls in the base maze, so gates only ever add
    shortcuts. The base maze stays connected, so no combination of switch
    states can cut anyone off. A check tests this for every combination over
    many seeds.
  - A flip is refused if it would close a gate with a player standing on it.
  - Each switch has a 1.5 s cooldown, so two players can't flicker it.
  - Rejected alternatives: map reveals, footprint trails and power-ups. Each
    adds unpredictability without making the opponent's choices matter more.
- **Movement that tolerates lag.**
  - The browser draws its own step immediately, using the saved layout, and
    sends queued steps in batches with one request in flight.
  - The server enforces speed as an allowance: one step per 140 ms on average,
    with up to four steps saved up.
  - Batches apply in order and stop at the first refused step. The server
    snapshot then replaces the prediction.
  - Effect: a player with a round-trip time up to about 560 ms keeps the same
    average speed as a player on a fast connection.
  - Rejected alternative: WebSockets. They would not remove the round trip; the
    fix is the batching, not the transport.
- **Step log, results, best times and replays.**
  - Every accepted step and flip is written to `maze_steps` with the server
    time, in the same transaction as the match.
  - A finished race writes one row to `maze_results`.
  - The leaderboard shows today's best times.
  - A replay rebuilds a finished race from the step log: both players' paths,
    the dead ends they explored and the switch flips. Replays of finished races
    are readable by any signed-in visitor, so leaderboard entries can link to
    them; live races stay visible only to their two players.

## Consequences and costs

- A daily maze can be memorised within a day. That is accepted, since it is
  what makes the times comparable.
- Prediction means a player can briefly see themselves somewhere the server
  then refuses, for example a gate the opponent closed while the step was in
  flight. The snapshot corrects this within one round trip.
- Close finishes are still decided by the order the server processes them;
  this is not latency compensation.
- The step log grows with play. At about 100 bytes a row it fits easily on
  the 1 GB volume at course scale; there is no retention policy yet.
