# Shared Space: process at crit 9

Shared Space now lets people join a room by name, arrange its activities
together, see who else is present and watch a drag before it is saved. I
kept this week's scope to any two users without account registration; login
can come later. Requirements review and code inspection established that
saved moves already travelled live. The work therefore extended the existing
interaction with presence, previews, reconnect recovery and preserved keyboard
focus ([`2956543`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/2956543),
[`7293ebc`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/7293ebc)).
The [Crit 9 brief](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/crits/09-all-at-once/)
asks for a defended decision about several people using the app. That made
their interaction, rather than a new transport, the behaviour to explain.

I retained Node 24, built-in SQLite and plain HTML, CSS and JavaScript. One
process and the `/data` volume suit the supplied 256 MB machine without a
separate database service or framework build
([`f30ad92`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/f30ad92)).
This reduces infrastructure, but synchronous database work and a handwritten
interface still need scrutiny. HTTP carries moves and throttled previews to
the server; server-sent events distribute them. That remains sufficient for
this interaction. Saved changes have replayable sequence numbers; presence
and previews are temporary state, excluded from durable history
([`2956543`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/2956543)).

The existing harness required checks before implementation. The session record
reports four of six new live checks initially failing; catch-up already
worked. The test commit explicitly records that distinction
([`c92d6d7`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/c92d6d7)).
Later, all three named-room checks initially failed
([`186f940`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/186f940)).
Separate commits for checks, implementation and corrections make the work
inspectable. `CLAUDE.md` now requires previews to stay out of replay history
and the page to recover after a closed stream
([`553c7ac`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/553c7ac)).

One correction came from the agent itself. A preview posted after a saved
move could restore an outline nobody was still dragging. The fix checks the
preview's base version against the saved object and withdraws a rejected
mover's preview ([`ca963f9`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/ca963f9)).
I did not discover this bug. Its connection to the existing version rule is
the useful lesson: temporary feedback must not contradict accepted state.

My own test exposed a different problem. Twelve automated checks and the
earlier two-browser runs had passed, yet two windows appeared unable to
exchange changes. The Fly-log investigation showed separate plan IDs; the
windows also shared a cookie, so they were not independent identities. Separate
browsers or profiles are still needed to test distinct participants. Each
window had created its own plan. The existing tests started with participants already
in one plan and missed the difficulty of getting there. The home-page commit
records that diagnosis ([`570a815`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/570a815)).

I chose named rooms from three alternatives: names, join codes and a public
list. A shared name makes joining explicit without maintaining a directory.
It also makes rooms guessable, an accepted limitation of this prototype.
Normalised names, a unique database index and a transaction keep simultaneous
creation requests in one room; existing plans remain reachable by link
([`78d7972`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/78d7972)).
The stream was unchanged by this fix. Asking the agent to check completeness
before deployment also exposed stale README instructions and led to the
room-name hint and a browser check of my two-window scenario
([`570a815`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/570a815),
[`2a626ff`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/2a626ff)).

The [multi-user decision](docs/decisions/0001-refuse-outdated-moves.md)
retains refusal of outdated saves. The version check and save share a
transaction. Compared with locking, this avoids holding an activity while a
person pauses or disconnects; the cost is that a refused mover must reconsider
and retry. Previews provide awareness, not exclusive ownership. The guarantee
is rejection of a stale save, not that an activity can never be moved again
([`f30ad92`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/f30ad92),
[`ca963f9`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/ca963f9)).

The session record reports 15/15 HTTP checks locally and live, plus browser
runs passing 10/10 live-feature, 4/4 restart/reconnect and 8/8 named-room checks.
It also records testing the database change on copied data before deployment.
These browser results and the migration rehearsal come from session notes;
their raw outputs are not committed. The two-browser and restart work is
therefore completed development verification, not independent user evaluation.

Next I need to observe whether people understand a refused move, retain
browser regressions in the repository, and test sustained contention. `spec/`
does not exercise drag outlines in a browser. Anyone knowing a room name or
link can edit; accounts and private permissions remain deliberately deferred.
