# Maze Duel

Two players enter the same maze from opposite corners. Each races to the
other player's entrance; the first valid finish accepted by the server wins.

This is the **first playable implementation**, not the final assessed argument
about what makes the project good. The earlier Shared Space application remains
available at `/shared-space/`; its original README is preserved in
[the earlier project notes](docs/shared-space-readme.md). `PROCESS.md` and the
crit reflections still describe that earlier work and need an author-written
account of the change in direction.

## Play

Open `/`, choose a nickname and create a race. Send the invitation link to a
friend using a separate browser or browser profile. Both players press
**I'm ready**; a shared three-second countdown starts the race.

Use **WASD**, **arrow keys** or the directional buttons. A starts at the top
left and must reach B at the bottom right; B takes the reverse journey. The
whole maze is visible. Players can pass through one another. A result ends
the race for both players. Choose **Create another race** to get a new
invitation for the same layout.

Identity belongs to this browser's cookie, not to a verified account. Reusing
a nickname in a different browser creates a different player. Clearing the
cookie loses access to that identity's races. Anyone with an unused invitation
can take the second seat; after that, only those two identities can access the
match. Use fictional nicknames, not sensitive information.

## Rules and limits

- One fixed, rotationally symmetric 13×13 maze; all passages reach both goals.
- The server validates each step, the countdown and the common speed limit.
  Commands carry a sequence number so a retried move is not applied twice.
- The first accepted finishing move wins. Network delay can influence close
  finishes; this is not a latency-compensated competitive game.
- A browser disconnect does not pause the clock. Reopening the invitation in
  the same browser restores the saved position. Controls stay disabled while
  the live connection is unavailable.
- A server restart interrupts an active race without awarding a winner.
  Completed results and waiting lobbies survive. Races end without a winner
  after ten minutes if neither player finishes.

Switches, procedural layouts, rankings and animated replays are outside this
milestone. Whether the race is engaging and feels fair still needs independent
playtesting. Keyboard and button controls do not establish full accessibility;
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

The stack retains Node's HTTP server, SQLite and browser JavaScript. Movement
commands use HTTP; [server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events)
deliver authoritative snapshots. The raised maze view uses Canvas 2D with a
fixed projection, not a WebGL engine. No runtime dependencies were added.
Fly's existing single-machine and persistent-volume configuration is retained.

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
