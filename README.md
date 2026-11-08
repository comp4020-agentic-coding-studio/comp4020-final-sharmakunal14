# Maze Duel

Maze Duel is a two-player maze race for friends. My definition of good is a
race where another person's choices can change your route, the result is
inspectable, and losing does not prevent you from playing together again.

## Play

[Open Maze Duel](https://comp4020-final-sharmakunal14.fly.dev/), choose a
nickname and create a race. Copy the invitation link.

On one computer, **the easiest setup is Player 1 in a normal window and
Player 2 opening the invitation link in an incognito/private window**, then
choosing their own nickname. Two normal windows in the same browser profile
share one player identity. On separate devices, both players can use normal
browsers.

Both press **I'm ready**. Race from opposite entrances to each other's
starting point. Use WASD/arrows or the touch pad; in first/third person,
forward walks and left/right/back turn. **E/Space** flips a switch;
**V** changes camera; **M** mutes.

## Why this race

Robin Sloan's [An app can be a home-cooked meal](https://www.robinsloan.com/notes/home-cooked-app/)
argues that software can succeed by serving a few people well. Here, rematches
matter more than audience growth; clear results and saved history still matter.

Switches make that friendship consequential: each opens one gate and closes
another for both players, so your shortcut can help your rival too. They remain
optional: an opportunity to reconsider routes, not a requirement to cooperate
or sabotage.

A daily seed gives races a shared reference. A 9 November
[rift revision](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/dd1d890)
left old and new layouts eligible for the same day's best-time records. Saved replays
show accepted steps and flips, making the outcome something friends can
discuss. Spectators get a separate read-only link without player chat.
The twelve campaign levels introduce navigation, switches, timed gates
and teleporting rifts; a completed race unlocks the next level for both players,
win or lose. Seven levels omit switches. Practice, fog and timed gates offer
variety, but do less to realise the central idea.

Gabriel Gambetta's [prediction and reconciliation](https://www.gabrielgambetta.com/client-side-prediction-server-reconciliation.html)
explains how immediate feedback can coexist with server authority. Maze Duel
predicts movement locally, then reconciles it with accepted server state. I
accept that compromise: responsiveness matters, but the browser cannot award
itself a win. The first valid finish processed by the server wins; network
delay can still decide a close race.

## What the evidence supports

The [harness](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/blob/main/CLAUDE.md)
turns these priorities into rules. The [checks](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/tree/main/spec)
cover symmetry and reachability across switch states over 200 generated seeds
and all twelve levels, legal movement, duplicate commands, concurrent finishes
and spectator access. SQLite stores results, layouts and replay actions before
broadcast. Persistence checks cover saved records and a real server restart.
Active races are interrupted on restart without awarding a winner; completed
results survive. Browser disconnects do not pause the clock.

These checks establish constraints, not enjoyment or equal difficulty. Friends
who played said they loved the idea of competing and the switches, but asked
for smoother controls and different camera perspectives. Their feedback
informed control changes and the map, third-person and first-person views.
Follow-up feedback is needed to judge whether those changes resolved their
concerns. Whether switches change route decisions or encourage repeat play
also remains unverified; agent-driven checks cannot establish those judgments.

## Deliberate limits

I left out power-ups and footprint trails to keep attention on routes and
shared gates, and free-roam movement to keep grid rules inspectable. Cookie
identity avoids account setup but loses access when cookies are cleared.
Fog is a visual restriction, not secret information. Keyboard and touch controls
do not make a spatial, visual maze fully accessible.

## Run locally

Use Node 24 and pnpm 11: `pnpm install --frozen-lockfile`, then `pnpm dev`.
Open `http://localhost:8080`; run `pnpm check` against the running app.
