# Shared Space: process at crit 8

Shared Space is a room-layout tool for a small team arranging an event. For
this first version, I narrowed the work to a Campus Clubs Fair: create an
example room, move its activities, share the plan, and return to the saved
positions. The first implementation includes browser identities, a shared
editor, clash messages, persistent moves and live updates
([`f30ad92`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/f30ad92)).
This gives the project a concrete interaction to examine before adding
equipment allocation, publishing or a more general drawing tool.

The stack is Node 24, its built-in SQLite database, and plain HTML, CSS and
JavaScript. The deployment provides one 256 MB machine and a persistent
volume. Keeping the application in one process avoids a separate database
service and a framework build; the Dockerfile runs the TypeScript server
directly and stores its database under `/data`
([`f30ad92`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/f30ad92)).
This is a simplicity choice, not a measured performance result. Synchronous
database work shares the server's process, and the handwritten interface and
Markdown renderer leave more behaviour for me to maintain and verify.

Moves use ordinary HTTP requests; server-sent events carry saved changes back
to open plans. That fits an interaction where the server accepts discrete
moves rather than broadcasting every pointer movement. Each move carries the
object version the participant saw. A transaction checks that version, saves
the new position and records history; an outdated move receives a conflict
response. Rejecting that move protects the saved position, but asks the
participant to reconsider and try again. It does not automatically reconcile
competing intentions ([`f30ad92`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/f30ad92)).

The most useful correction is visible in the next two commits. HTTP checks
were added for a later participant reading a saved move, rejection of a stale
move, and delivery of a live update. The test commit records that the stream
check failed because the response headers were buffered until an event arrived
([`7059a6a`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/7059a6a)).
The fix writes an opening comment immediately
([`4937674`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/4937674)).
This was a failure in the interaction between client and server, despite both
pieces existing in the implementation.

The agent-assisted workflow now has a specific acceptance standard: connect
product promises to checks against the running application, and turn observed
failures into rules. `CLAUDE.md` records the stream correction alongside rules
for stale edits, confirmed saves, non-drag controls and preserving focus
([`fe9496e`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/fe9496e)).
The implementation, tests and fix have separate commits, making that correction
traceable. Their existence does not prove every product rule is already met.

For this first written definition of good, I use Gutwin and Greenberg's
[workspace-awareness framework](https://hcitang.org/uploads/Teaching/2002-DescriptiveFramework.JCSCW.pdf)
to question whether participants can understand changes, and W3C's
[dragging guidance](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)
to distinguish keyboard access from a clickable or tappable alternative.
These sources help evaluate the current design; I am not claiming the commits
document a prior literature-led design process.

The current evidence remains limited. The three application tests do not
exercise browser rendering, focus, restart durability or redeployment. Link
holders can join as editors; private membership, recovery controls and a
publication workflow are not implemented. The next acceptance work is a
two-browser walkthrough, keyboard and touch checks, and a restart test using
retained data. These are outstanding checks, not completed user evaluation.
