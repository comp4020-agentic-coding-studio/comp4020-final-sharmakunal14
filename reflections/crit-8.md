# Crit 8 — Making collaboration testable

## What was the breakthrough that moved the work forward?

The breakthrough was reducing the Shared Space plan to one working interaction:
two named participants rearranging the same Campus Clubs Fair layout. The first
implementation uses Node's built-in SQLite to save moves, streams updates to
other participants, and rejects outdated moves instead of silently overwriting
someone else's work ([`f30ad92`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/f30ad92)).
It also provides keyboard and button controls alongside dragging, and reports
clashes while allowing an unfinished layout to be saved.

The useful failure came from testing that interaction over HTTP. The live-update
check exposed a connection that waited for its first event before sending
headers ([`7059a6a`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/7059a6a)).
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

The current tests cover reading a saved move from another session, rejecting a
stale move, and receiving a streamed update. They do not establish survival
across restarts or redeploys, browser accessibility, or usability. Anyone with
the plan link can currently join as an editor. My next priority is to test those
boundaries and replace the README and process placeholders before expanding
the feature list.
