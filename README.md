# Maze Duel

Maze Duel is a two-player maze race for friends. My definition of good is a
race where another person's choices can change your route, the result is
inspectable, and losing does not prevent you from playing together again.

## Play

[Open Maze Duel](https://comp4020-final-sharmakunal14.fly.dev/), choose a
nickname, create a race and send the invitation to a friend in a separate
browser profile or incognito window. Both press **I'm ready**. Race from
opposite entrances to each other's starting point. Use WASD/arrows or the
touch pad; in first/third person, left/right turn. **E/Space** flips a switch;
**V** changes camera; **M** mutes.

## Why this race

Robin Sloan's [An app can be a home-cooked meal](https://www.robinsloan.com/notes/home-cooked-app/)
offers a useful standard: software can succeed by serving a few people well.
I take that seriously here. A rematch with a friend matters more than building
a large audience. However, a small audience does not excuse ambiguous results
or losing people's history.

The daily maze makes that friendship consequential. A switch opens one gate
and closes another for both players: a shortcut you create can help your rival
too. I want players to reconsider routes because someone else is present.
Switches remain optional shortcuts, so this creates an opportunity for
interaction, not a requirement to cooperate or sabotage.

One maze per Sydney day gives repeated races a shared reference. Saved replays
show accepted steps and flips, making the outcome something friends can
discuss. Spectators get a separate read-only link without player chat.
The twelve campaign levels introduce navigation, switches, timed gates
and teleporting rifts; a completed race unlocks the next level for both players,
win or lose. Seven levels have no switches. I kept them for practice and variety,
but they do less to realise the central idea. Fog and timed gates challenge navigation;
they do not demonstrate that the opponent matters.

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
