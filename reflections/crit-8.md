# Crit 8 — Making collaboration testable

## What was the breakthrough that moved the work forward?

Shared Space became manageable when I focused on two people rearranging one
Campus Clubs Fair layout. At this stage, good meant keeping each person's
saved work safe while allowing an unfinished plan. SQLite stored the moves,
streams sent them to the other participant, and version checks refused an
outdated move rather than overwriting a newer one
([`f30ad92`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/f30ad92)).
People could use buttons or the keyboard as well as dragging. A clash was
reported, but did not stop them saving a draft.

The live-update check then stalled. The connection waited for its first event
before sending headers
([`7059a6a`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/7059a6a)).
Writing an opening comment immediately fixed that delay
([`4937674`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/4937674)).
This was a small fix with a useful consequence: I had a check showing whether
another session could actually receive a move, rather than just an endpoint
that looked implemented.

## What did this work change about who I want to be as a software developer?

I need to be more specific when asking an agent whether something works.
For Shared Space, that meant checking a move from another session and trying
an outdated save. The initial `CLAUDE.md` turned those expectations, along with
confirmed saves, keyboard controls and immediate stream opening, into rules
([`fe9496e`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/fe9496e)).

The checks were still limited. They covered saved moves, stale edits and
streamed updates, but had not established survival across restarts or
redeploys, browser accessibility, or ease of use. Anyone with the plan link
could join as an editor. Before adding more objects to the planner, I needed
to find out what happened when people entered it and used it differently
from the test setup.
