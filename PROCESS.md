# Maze Duel: process

## Why I changed the project

Shared Space started with a simple aim: people should rearrange an event layout
without overwriting each other's saved work [`f30ad92`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/f30ad92). An HTTP check exposed
a stream that sent nothing until its first event. The fix became a rule in
`CLAUDE.md`: open the stream immediately ([`4937674`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/4937674), [`fe9496e`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/fe9496e)).

During the Crit 9 work, I thought live updates were broken. My two windows had
actually created different plans under the same browser identity. The logs
pointed to the joining flow, which led to named rooms and clearer instructions
([`78d7972`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/78d7972), [`570a815`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/570a815)). The tests started with people already in one plan;
I had missed how they would get there.

Classmates liked Shared Space but found arranging objects plain and suggested
something more creative. I chose a game where another person could affect
how you played. At Crit 10, friends tried the local Maze Duel concept and
liked the competition and switches. Their requests for smoother controls and
camera views informed later changes. This is my retrospective account; the
repository records Maze Duel from 1 November [`ca89fdd`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/ca89fdd). Shared Space stayed
available on its own route [`b5a5b55`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/b5a5b55).

## Why I kept the stack

The course provided one 256 MB machine and a persistent volume. Keeping Node
24, built-in SQLite, browser JavaScript and server-sent events let me reuse
working storage and live updates. I accepted handwritten routing, synchronous
database work and a single-machine limit
([decision 0002](docs/decisions/0002-maze-duel-first-playable.md), [`9f1a49f`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/9f1a49f)).
Cookie identities removed account setup, but clearing cookies loses access;
server-side membership checks stop a nickname granting someone else's seat
[`d59394a`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/d59394a).

WebSockets were an alternative. I kept HTTP and SSE because the immediate
bottleneck was waiting for one reply before sending more movement
([decision 0003](docs/decisions/0003-shared-maze-mechanics.md)). Local prediction
and batched inputs addressed that wait [`e5231c7`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/e5231c7).
Full snapshots simplified reconnection but sent more data than individual
updates. The browser corrects a predicted step when the server refuses it.
[Gambetta's explanation](https://www.gabrielgambetta.com/client-side-prediction-server-reconciliation.html)
helps explain that trade-off. The batch check uses 300 ms pauses [`792166e`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/792166e),
but its allowance of under 350 ms per step is too loose to prove unchanged
speed. Close finishes still depend on server processing order.

For the camera views, I chose vendored Three.js over React Three Fiber, a CDN
or handwritten WebGL. That kept the stack without a build step, at the cost
of a larger download and more rendering work. Movement stayed on the same
server-checked grid ([`f9c6d5c`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/f9c6d5c), [`d77f9ea`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/d77f9ea)).

The first race allowed players to ignore each other. Before milestone 2 was
implemented, I specified shared switches, a daily maze and saved replays
[`95fb936`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/95fb936). A random maze per race would make times harder to compare. Switches
could change both routes without adding power-ups. The 200-seed sweep checks
symmetry and reachability across switch states [`790c9ea`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/790c9ea); it cannot tell me
whether the routes feel equally difficult.

## How I directed the work

I set the direction and asked for critical reviews; the agent implemented
much of the code, tests and browser verification. Design and progress records
kept decisions outside the chat [`4d43564`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/4d43564). Branches and pull requests made
changes easier to review, and CI tested the Docker image before deployment.
An accidentally committed `node_modules` link caused a failed check and blocked
deployment until it was removed [`e1071ed`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/e1071ed). This added time to each change,
but caught a mistake before it reached the live app.

I also cut back the proposed Rift Runners feature list. Rotating rooms would
complicate grid authority, while reveal abilities and footprints would add
information without making players affect each other more [`9588827`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/9588827). I
removed device full screen after leaving it at the result resized the whole
layout. A check now prevents those API calls returning [`1923400`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/1923400).

I cannot call the whole project test-driven. The milestone-2
[progress entry](PROGRESS.md#2026-11-01--milestone-2-shared-maze-mechanics-deployed)
records tests written with or after code and HTTP checks that passed first
time. Putting fail-first in `CLAUDE.md` did not mean I had followed it.

## What the failures changed

During the 3D work, broken JavaScript syntax blanked the page while HTTP
checks passed. They fetched the file without executing it. Every browser
module now gets a `node --check` guard [`62440eb`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/62440eb); the implementation record
reports trying deliberately broken syntax [`c2e0af5`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/c2e0af5). That covers parsing,
while rendered controls still need browser checks.

A pulse-gate test passed against an old server and skipped the new behaviour.
The harness now requires a restarted server or a separate `APP_URL`, and a
skippable test cannot be the only evidence [`0fab9a5`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/0fab9a5). The
[verification record](PROGRESS.md#2026-11-02--pulse-gates-local-branch-pulse-gates-not-pushed)
then disabled the rule and observed both unit and HTTP failures.

The spectator bug was more serious because the test expected the wrong
behaviour. It required a public race identifier that also allowed joining an
empty seat. An agent review found this. The fix removed the identifier,
substituted an opaque key and checked HTTP and streamed responses [`8b9b3fa`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/8b9b3fa).
The harness now says to check the product promise before copying existing
output into an assertion [`583cc01`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/583cc01).

I also reported missing sound while audio scheduling tests passed. Raising
the levels and measuring output addressed the complaint ([`987c441`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/987c441),
[`cda2fec`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/cda2fec)); a gain check guards against the known quiet configuration
[`a0568a2`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/a0568a2). It still cannot replace listening on the device.

## What I still need to check with players

[Sloan's home-cooked software](https://www.robinsloan.com/notes/home-cooked-app/)
helped me reconsider the extra features against the friends playing. Campaign
progression lets both players continue after a completed race, regardless of
who wins ([`0e7bc8d`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/0e7bc8d), [`267700f`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/267700f)). Seven levels omit switches to introduce
other mechanics, but that also reduces the shared interaction. In a quick-play
race on 9 November, my friend's switch flip made both of us change route.
That supports the idea in one race; repeat play is still untested.

Rift corrections limited shortcuts, then hid them off the direct route
([`dd1d890`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/dd1d890), [`9667c54`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/9667c54)). Saved replays stayed stable, but the unchanged daily
ranking key can compare different layouts. Restart and storage checks cover
identities, interrupted races and completed results ([`f7533be`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/f7533be), [`b20005b`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/b20005b)).
Camera choice needed `localStorage` to survive window closure [`dd1d890`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/dd1d890).

Maze action logs arrived on 9 November [`27ce3b3`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/27ce3b3), so they cannot establish
what I observed at Crit 10. A later
[audit](PROGRESS.md#2026-11-09--readme-argument-and-evidence-review)
found invitation identifiers in refusal logs despite passing tests. Fixed
action names and refusal checks closed that leak [`fd1357c`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/fd1357c).

The next useful feedback is from friends trying the revised controls and
views again. The browser checks recorded in [PROGRESS.md](PROGRESS.md) were
agent-driven; they cannot tell me whether those changes answered the complaint.
