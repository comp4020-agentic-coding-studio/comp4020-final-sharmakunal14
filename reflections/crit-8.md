# Crit 8 — Making collaboration testable

## What was the breakthrough that moved the work forward?

The breakthrough was reducing Shared Space to one working interaction: two
named participants rearranging the same Campus Clubs Fair layout. My initial
definition of good was to preserve each other's saved work while allowing an
unfinished draft. Node's built-in SQLite saves moves, streams update other
participants, and version checks reject outdated moves instead of silently
overwriting someone else's work
([`f30ad92`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/f30ad92)).
Keyboard and button controls accompany dragging; clashes do not block saving.

The useful failure came from testing that interaction over HTTP. The
live-update check exposed a connection that waited for its first event before
sending headers
([`7059a6a`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/7059a6a)).
Writing an opening comment immediately fixed that delay
([`4937674`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/4937674)).
A stream endpoint existing in the code was not enough; another participant had
to be able to connect and receive a move. That gave me a concrete standard for
accepting the agent's output.

## What did this work change about who I want to be as a software developer?

I want to become a developer who turns product promises into observable checks
and uses failures to improve how I direct the agent. The initial `CLAUDE.md`
records rules about stale moves, confirmed saves, alternatives to dragging,
and opening streams immediately
([`fe9496e`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/fe9496e)).
These rules are commitments to verify, not proof that every interaction already
meets them.

At this stage, the tests covered reading a saved move from another session,
rejecting a stale move, and receiving a streamed update. They did not establish
survival across restarts or redeploys, browser accessibility, or usability.
Anyone with the plan link could join as an editor. Those limits made testing
the boundaries more important than expanding the feature list.
