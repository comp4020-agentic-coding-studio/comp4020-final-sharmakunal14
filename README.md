# Maze Duel

Two players enter the same maze from opposite corners. Each races to the
other player's entrance; the first valid finish accepted by the server wins.

Each day brings one new maze. Each side has a switch that opens one gate and
closes another for both players, so your shortcut may also be theirs. Finished
races are saved with today's best times and can be replayed. This README is
still factual notes, not yet the final argument about what makes the project good. The earlier Shared Space application remains
available at `/shared-space/`; its original README is preserved in
[the earlier project notes](docs/shared-space-readme.md). `PROCESS.md` and the
crit reflections still describe that earlier work and need an author-written
account of the change in direction.

## Play

Open `/`, choose a nickname and create a race. Send the invitation link to a
friend using a separate browser or browser profile. Both players press
**I'm ready**; a shared three-second countdown starts the race.

The maze is a 3D desert labyrinth. Press **V**, or use the Map / 3rd / 1st
buttons, to switch between an orbitable map, a third-person chase camera and
first person.
- In map view, **WASD**, the **arrow keys** or the on-screen pad move you in
  screen directions.
- In third and first person, **W** walks forward, while **A**/**D** turn and
  **S** turns around.

A starts at one portal and must reach the other; B takes the reverse journey.
Players can pass through one another.

Standing on a switch (◆) lets you press **E**, **Space** or **Flip switch**.
That opens the gates of its colour that are closed and closes those that are
open, for both players.

A result ends the race for both players. **Watch the replay** shows both
routes, dead ends included. Today's best times appear on the home page.

Identity belongs to this browser's cookie, not to a verified account. Reusing
a nickname in a different browser creates a different player. Clearing the
cookie loses access to that identity's races. Anyone with an unused invitation
can take the second seat; after that, only those two identities can access the
match. Use fictional nicknames, not sensitive information.

## Rules and limits

- One generated, rotationally symmetric 15×15 maze per Sydney day. In every
  switch state, every passage reaches both goals; this is checked over 200 seeds.
- The server validates each step, flip and gate, the countdown and a shared
  speed allowance (140 ms per step on average, with up to four banked steps).
  Commands carry sequence numbers, so a retried batch is not applied twice.
- Your own steps are drawn straight away and sent in batches. A slow
  connection delays confirmation but does not slow your average pace.
- The first accepted finishing move wins. Network delay can influence close
  finishes; this is not a latency-compensated competitive game.
- A browser disconnect does not pause the clock. Reopening the invitation in
  the same browser restores the saved position. Controls stay disabled while
  the live connection is unavailable.
- A server restart interrupts an active race without awarding a winner.
  Completed results and waiting lobbies survive. Races end without a winner
  after ten minutes if neither player finishes.

Accounts, power-ups and map reveals are deliberately left out. Whether the
switches create real decisions still needs independent playtesting. Keyboard and button controls do not establish full accessibility;
the spatial maze remains a visual interaction.

## Run locally

Use the Node 24 and pnpm 11 versions in `mise.toml`:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:8080`. `PORT` overrides the port; `DATA_DIR` selects the
database directory (normally `./data` locally and `/data` on Fly.io). To run
without file watching, use `pnpm start`. Watch-mode restarts interrupt races.

The stack retains Node's HTTP server, SQLite and browser JavaScript, plus
Three.js r170 vendored as a single file for the 3D view. Movement
commands use HTTP; [server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events)
deliver authoritative snapshots. Browsers without WebGL fall back to a 2D
projected view. No server runtime dependencies were added.
Fly's existing single-machine and persistent-volume configuration is retained.

## Development records

- [Design](docs/design.md): current scope, architecture, rules and trade-offs.
- `PROGRESS.md`: dated implementation work, commit references,
  verification results and outstanding items.
- [Initial decision record](docs/decisions/0002-maze-duel-first-playable.md):
  why the first playable version uses this scope and runtime.
- `CLAUDE.md`: the implementation standards, including keeping these records
  current as work proceeds.

## Verification

With the app running:

```sh
pnpm check
pnpm check:evidence
```

For a different address, set `APP_URL=http://localhost:8089`. The checks cover
maze reachability, movement rules, two-player limits, access control, malformed
requests, concurrent finishes, live updates, reconnect snapshots, stored
results, actual server restart and keyboard-input safety. The earlier Shared
Space checks remain. The evidence check validates document structure and cited
commits; it does not establish that the old process narrative describes this
new implementation.
