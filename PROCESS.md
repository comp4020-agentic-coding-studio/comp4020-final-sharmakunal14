# Maze Duel: process

## From shared planning to shared competition

Shared Space began with a concrete standard: people should rearrange one event
layout without silently overwriting each other's saved work [`f30ad92`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/f30ad92). An
HTTP check then exposed a stream that sent nothing until its first event; the
fix became a rule to open streams immediately ([`4937674`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/4937674), [`fe9496e`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/fe9496e)).

Crit 9 work exposed a different gap. My two-window attempt created separate
plans under one browser identity, although the collaboration checks passed.
Reading the logs redirected the repair towards named rooms and clearer joining
instructions ([`78d7972`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/78d7972), [`570a815`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/570a815)). Tests of people already sharing a plan had
missed the journey into that plan.

Classmates liked Shared Space but found arranging objects plain and encouraged
a more creative game. I chose competition while retaining the technical
foundation. At Crit 10, I tested Maze Duel locally: friends liked the
competition and switches, but asked for smoother controls and different
viewpoints. This is my retrospective account; the repository records Maze Duel
from 1 November [`ca89fdd`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/ca89fdd), with Shared Space kept on its own route [`b5a5b55`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/b5a5b55).

## Choosing the architecture and the game

The course fixed one 256 MB machine and a persistent volume. I retained
Node 24, built-in SQLite, plain browser modules and server-sent events,
reusing working storage and live updates. Running TypeScript directly removed
a build step, not the need for type checking. The costs are handwritten routing
and browser lifecycles, synchronous database work and a single-machine
deployment ([decision 0002](docs/decisions/0002-maze-duel-first-playable.md), [`9f1a49f`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/9f1a49f)).

Cookie identities avoid account setup, but clearing cookies loses access.
Game commands require server-side membership checks; knowing someone's
nickname does not grant their seat [`d59394a`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/d59394a).

WebSockets were the obvious transport for a real-time game. I kept HTTP
commands and SSE snapshots because the movement problem was waiting for each
reply, and a different transport would not remove the round trip
([decision 0003](docs/decisions/0003-shared-maze-mechanics.md)). Prediction and
batched inputs did [`e5231c7`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/e5231c7), and a check holds average speed over a 300 ms
round trip [`792166e`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/792166e). Rejected predictions must be corrected.
[Gambetta's explanation](https://www.gabrielgambetta.com/client-side-prediction-server-reconciliation.html)
helps evaluate this compromise: immediate feedback remains subordinate to
server state. It does not justify claiming latency-neutral finishes.

For camera choice, I accepted a vendored Three.js file instead of React Three
Fiber, a CDN dependency or handwritten WebGL. This preserved the build-free
stack but increased download and rendering costs. Cameras remained
presentation; the server still checked grid movement ([`f9c6d5c`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/f9c6d5c), [`d77f9ea`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/d77f9ea)).

The first playable race let players ignore each other's decisions. Milestone
2 therefore specified shared switches, a daily maze and saved replays before
implementation [`95fb936`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/95fb936). A fresh maze every race would undermine comparison;
switches could affect both players without requiring power-ups. A permanent
200-seed sweep checks symmetry and reachability across switch states
[`790c9ea`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/790c9ea): navigability in sampled layouts, not equal perceived difficulty.

## Directing and checking the agent

I set the direction and requested critical reviews; the agent implemented much
of the code, tests and browser verification. I required ongoing design and
progress records so decisions and evidence were not left in chat [`4d43564`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/4d43564).

From 3 November every change went through a branch and pull request, and CI
deployed only after the checks passed against the Docker image. That cost
minutes per change but made each deploy one reviewable unit. It held when a
merged change accidentally committed a `node_modules` link: the check failed,
the deploy did not run, and the fix shipped separately [`e1071ed`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/e1071ed).

Judgement also shows in what I discarded. My own "Rift Runners" plan proposed
ten features. I kept timed gates, fog and rifts, and rejected rotating rooms,
which would break grid authority, and reveal abilities and footprints, which
add information without making the opponent's choices matter more [`9588827`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/9588827).
I removed device full screen outright once leaving it at the result resized
everything at once, with a check that keeps the Fullscreen API out [`1923400`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/1923400).

The milestone-2 instruction commit precedes its implementation, but I cannot
describe the whole project as test-driven. The
[progress entry](PROGRESS.md#2026-11-01--milestone-2-shared-maze-mechanics-deployed)
records tests written with or after the code and HTTP checks that passed on
their first run. A fail-first rule in `CLAUDE.md` did not mean I had followed it.

## Corrections that changed the workflow

During the 3D work, a corrupted browser module blanked the page while HTTP
checks passed: they fetched JavaScript without executing it. The correction
added a permanent `node --check` guard for every browser module [`62440eb`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/62440eb),
checked against deliberately broken syntax [`c2e0af5`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/c2e0af5). It catches a parse
failure, not a broken control.

A pulse-gate check then passed against an old server and skipped the behaviour
being added. The harness now requires restarting the server, or using a
separate port through `APP_URL`, and rejects a skippable test as the only
feature evidence [`0fab9a5`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/0fab9a5). The
[recorded verification](PROGRESS.md#2026-11-02--pulse-gates-local-branch-pulse-gates-not-pushed)
disabled the rule and watched both unit and HTTP checks fail. Seeing a test
detect the missing behaviour mattered more than another green run.

The spectator review revealed a stronger failure: the test itself preserved
the wrong promise. It expected the race identifier in the public payload,
although that identifier also let someone join an empty seat. The correction
removed it, introduced an opaque display key, and checked both HTTP and
streamed payloads [`8b9b3fa`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/8b9b3fa). The harness now requires checking the product
promise rather than reproducing current output [`583cc01`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/583cc01). An agent review found
this, not a player.

Audio exposed the difference between a proxy and an experience. When I
reported missing sound, scheduling tests were already passing. The response
raised levels and required output measurement ([`987c441`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/987c441), [`cda2fec`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/cda2fec)); a
regression guard then checked configured gains [`a0568a2`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/a0568a2). It guards the known
low-gain failure; it is not a listening test.

## What remains a judgment

Revisiting the argument with
[Sloan's home-cooked software](https://www.robinsloan.com/notes/home-cooked-app/)
gave me a test of scope: does another feature serve these friends? I chose
campaign progression after a completed race, win or lose, so the weaker player
could continue ([`0e7bc8d`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/0e7bc8d), [`267700f`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/267700f)). Seven levels omit switches so each world
introduces one mechanic first; whether that improves repeat play is untested.

A rift correction capped shortcuts but left two layouts sharing one day's
rankings [`dd1d890`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/dd1d890); saved replays stayed stable.

Persistence has concrete checks: a real process restart preserves identities
and interrupts an active race; database reopening preserves completed results
([`f7533be`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/f7533be), [`b20005b`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/b20005b)). Camera choice moved from `sessionStorage` to per-race
`localStorage` once closing the window lost it [`dd1d890`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/dd1d890). Browser runs in
[PROGRESS.md](PROGRESS.md) are agent-driven, not playtests. The
[CI workflow](.github/workflows/checks.yml) tests the Docker image before
deployment; its final HTTP-200 probe shows availability, not playability.

Maze action logs arrived on 9 November [`27ce3b3`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/27ce3b3), after Crit 10, so they are
not evidence of its log exercise. A later
[audit](PROGRESS.md#2026-11-09--readme-argument-and-evidence-review) found
invitation identifiers in refusal logs although the log test passed. Fixed
action names and checks for forbidden reads and bad watch tokens closed that
leak [`fd1357c`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/fd1357c). The standard I now hold: a check counts once I have seen it fail
on the behaviour it protects, and what automation cannot see goes to players.
