# Maze Duel

Maze Duel is a two-player maze race for friends. I wanted more than two people
racing separately through the same maze: a switch your friend flips should make
you rethink your route. A good race also needs a result you can check and a
way to keep playing together after either person loses.

## Play

[Open Maze Duel](https://comp4020-final-sharmakunal14.fly.dev/), choose a
nickname and create a race. Copy the invitation link.

On one computer, **the easiest setup is Player 1 in a normal window and
Player 2 opening the invitation link in an incognito/private window** and
choosing their own nickname. Normal windows in the same browser profile share
one player identity. On separate devices, normal browsers work.

Both press **I'm ready**. Race from opposite entrances to each other's
starting point. Use WASD/arrows or the touch pad; in first/third person,
forward walks and left/right/back turn. **E/Space** flips a switch;
**V** changes camera; **M** mutes.

## Why this race

Robin Sloan's [An app can be a home-cooked meal](https://www.robinsloan.com/notes/home-cooked-app/)
argues that software can serve a few people well. That fits what I want here:
friends asking for another race. Ranked matchmaking would put more attention
on standing among strangers; I chose rematches with someone you know.

A switch opens one gate and closes another for both players, so your shortcut
can help your rival too. Switches are optional, so players can still race
without using them. The daily maze gives friends a layout to learn together;
saved replays show accepted steps and flips. Spectators have a separate
read-only link without player chat.

The twelve campaign levels introduce navigation, switches, timed gates and
rifts gradually. Seven have no switches, which gives players practice but
also less interaction with their opponent. Finishing unlocks the next level
for both players, so losing does not stop them progressing together.

Gabriel Gambetta's [prediction and reconciliation](https://www.gabrielgambetta.com/client-side-prediction-server-reconciliation.html)
explains the movement trade-off. The browser draws a step immediately, then
corrects it if the server refuses it. This makes controls respond sooner, but
can cause a visible correction. The server decides the winner, and network
delay can still decide a close finish.

## What the evidence supports

The [harness](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/blob/main/CLAUDE.md)
sets the rules; the [checks](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/tree/main/spec)
cover symmetry and reachability across switch states over 200 seeds and all
twelve levels, legal moves, duplicate commands, concurrent finishes and
spectator access. SQLite saves state before broadcast. Restart checks cover
identities and interrupted races; storage checks cover completed results.
Restarting interrupts active races without a winner. Browser disconnects do
not pause the clock.

Friends liked competing and the switches, but asked for smoother controls and
more camera views. That feedback informed those changes; I still need their
assessment of the improvements. In a quick-play race on 9 November, my friend
flipped a switch and both of us changed route. That is one example of the
interaction I wanted. It does not tell me how often it happens or whether
players return. Automated checks do not answer those questions.

## Deliberate limits

Power-ups and footprint trails would distract from routes and shared gates;
free-roam movement would complicate the grid rules. Cookie identity avoids
accounts but loses access when cookies are cleared. Fog only hides the view.
Two rift revisions ([one](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/dd1d890),
[two](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/9667c54))
changed the 9 November maze without separating its rankings, so best times can
compare different layouts. Keyboard and touch support leave accessibility
limits in a spatial, visual game.

## Run locally

Use Node 24 and pnpm 11: `pnpm install --frozen-lockfile`, then `pnpm dev`.
Open `http://localhost:8080`; run `pnpm check` against the running app.
