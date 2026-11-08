# Maze Duel: process

## From shared planning to shared competition

Shared Space began with a concrete standard: people should rearrange one event
layout without silently overwriting each other's saved work
([`f30ad92`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/f30ad92)). During Crit 8 work, an HTTP check exposed a stream that did not
send headers until its first event. The fix became an instruction to open
streams immediately, connecting a failure to a future rule
([`4937674`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/4937674), [`fe9496e`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/fe9496e)).

Crit 9 work exposed a different gap. My two-window attempt created separate plans
under one browser identity, although the collaboration checks passed. Reading
the logs redirected the repair towards named rooms and clearer joining
instructions ([`78d7972`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/78d7972), [`570a815`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/570a815)). Tests of people already
sharing a plan had missed the journey into that plan.

Classmates liked Shared Space but found arranging objects plain and encouraged
a more creative game. I chose to explore competition while retaining the
technical foundation. At Crit 10, I tested Maze Duel locally to validate the
concept. Friends liked the competition and switch concept, but requested smoother
controls and different viewpoints; that feedback informed subsequent changes. This is
my retrospective account: the repository records Maze Duel implementation
from 1 November ([`ca89fdd`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/ca89fdd)), not the earlier local session.

Shared Space remained available through its own route when Maze Duel became
the home page ([`b5a5b55`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/b5a5b55)).

## Choosing the architecture and the game

The course fixed one 256 MB machine and a persistent volume. I retained
Node 24, built-in SQLite, plain browser modules and
server-sent events, reusing working storage and live updates. Running TypeScript
directly removed a build step, not the need for type checking. The costs are
handwritten routing and browser lifecycles, synchronous database work and a
single-machine deployment
([decision 0002](docs/decisions/0002-maze-duel-first-playable.md), [`9f1a49f`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/9f1a49f)).

Cookie identities avoid account setup, but clearing cookies loses access.
Game commands require server-side membership checks; knowing someone's
nickname does not grant their seat ([`d59394a`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/d59394a)).

HTTP commands and SSE snapshots also survived the pivot. The movement problem
was waiting for each reply, so changing transport alone would not solve it.
Prediction and batched inputs reduced that waiting
([`e5231c7`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/e5231c7)), accepting that rejected predictions must be corrected.
[Gambetta's explanation](https://www.gabrielgambetta.com/client-side-prediction-server-reconciliation.html)
helps evaluate this compromise: immediate feedback remains subordinate to
server state. It does not justify claiming latency-neutral finishes.

For camera choice, I accepted a vendored Three.js file instead of React Three
Fiber, a CDN dependency or handwritten WebGL. This preserved the build-free
stack but increased download and rendering costs. Cameras remained presentation;
the server still checked grid movement
([`f9c6d5c`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/f9c6d5c), [`d77f9ea`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/d77f9ea)).

The first playable race let players ignore each other's decisions. Milestone
2 therefore specified shared switches, a daily maze and saved replays before
implementation ([`95fb936`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/95fb936)). A fresh maze every race would undermine
comparison; switches could affect both players without requiring power-ups.
The generator's permanent 200-seed sweep checked symmetry and reachability
across switch states ([`790c9ea`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/790c9ea)). This checks navigability in sampled layouts,
not equal perceived difficulty or every possible seed.

## Directing and checking the agent

I set the direction and requested critical reviews; the agent implemented much
of the code, tests and browser verification. I required ongoing design and
progress records so decisions and evidence were not left in chat
([`4d43564`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/4d43564)). Separating rules, storage, endpoints and browser work
bounded each review. Small commits made changes inspectable, while decision
records retained rejected alternatives.

The milestone-2 instruction commit precedes its implementation, but I cannot
describe the whole project as test-driven. The contemporaneous
[progress entry](PROGRESS.md#2026-11-01--milestone-2-shared-maze-mechanics-deployed)
explicitly records tests written with or after the code and HTTP checks that
passed on their first run. A fail-first rule in `CLAUDE.md` did not establish
that I had followed it.

## Corrections that changed the workflow

During the 3D work, a corrupted browser module blanked the page while HTTP
checks passed. They fetched JavaScript without executing it. The correction
added a permanent `node --check` guard for every browser module
([`62440eb`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/62440eb)); the implementation record
[`c2e0af5`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/c2e0af5)
reports checking it against deliberately broken syntax. This closes a parsing
gap; it still cannot establish that a rendered control works.

A pulse-gate check then passed against an old server and skipped the behaviour
being added. The harness was tightened to require restarting the server, or
using a separate port through `APP_URL`, and to reject a skippable test as the
only feature evidence ([`0fab9a5`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/0fab9a5)). The
[recorded verification](PROGRESS.md#2026-11-02--pulse-gates-local-branch-pulse-gates-not-pushed)
then disabled the rule and observed both unit and HTTP checks fail. Checking
that a test can detect the missing behaviour mattered more than another green run.

The spectator review revealed a stronger failure: the test itself preserved
the wrong promise. It expected the race identifier in the public payload,
although that identifier also let someone join an empty seat. The correction
removed it, introduced an opaque display key, and checked both HTTP and streamed
payloads ([`8b9b3fa`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/8b9b3fa)). The resulting harness rule requires checking the
product promise rather than reproducing current output
([`583cc01`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/583cc01)). This was an agent-discovered flaw, not a classmate observation.

Audio exposed the difference between a proxy and an experience. When I reported
missing sound, scheduling tests were already passing. The response increased
levels and required output measurement
([`987c441`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/987c441), [`cda2fec`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/cda2fec)); a regression guard then checked configured
gains ([`a0568a2`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/a0568a2)). That guards the known low-gain failure, but it is
not a listening test or proof of audibility on every device.

## What remains a judgment

Revisiting the final argument with
[Sloan's home-cooked software](https://www.robinsloan.com/notes/home-cooked-app/)
gave me a useful test of scope: does another feature serve these friends?
I chose campaign progression after a completed race, win or lose, so the weaker
player could continue ([`0e7bc8d`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/0e7bc8d), [`267700f`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/267700f)).
However, seven levels omit switches. Variety has diluted the central interaction;
I have not established that those additions improve repeat play.

A rift correction capped shortcuts but left different daily layouts sharing
a ranking key
([`dd1d890`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/dd1d890)).
Saved replays stayed stable; time comparisons could still be misleading.

Persistence has concrete checks: a real process restart preserves identities
and interrupts an active race; database reopening preserves completed results
([`f7533be`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/f7533be), [`b20005b`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/b20005b)).
Camera state needed a separate correction: `sessionStorage` survived reloads
but not window closure. Per-race `localStorage` addressed that boundary while
tolerating blocked storage
([`dd1d890`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/dd1d890)).
Browser runs in [PROGRESS.md](PROGRESS.md) are agent-driven, often using emulated
phones or API opponents. They are distinct from friends' informal feedback.
The supplied [CI workflow](.github/workflows/checks.yml) tests the Docker image
before deployment; its final HTTP-200 probe establishes availability, not
playability.

Maze action logs were added on 9 November ([`27ce3b3`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/27ce3b3)); this does not
establish the Crit 10 URL-only log exercise. A later
[audit record](PROGRESS.md#2026-11-09--readme-argument-and-evidence-review)
identified invitation identifiers in refusal logs despite the test passing.
Fixed action names and regression checks for forbidden reads and bad watch
tokens closed the known leak
([`fd1357c`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/fd1357c)).
My responsibility is to demand
evidence tied to the promise, then seek player feedback where automation
cannot supply it.
