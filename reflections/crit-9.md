# Crit 9 — Finding the joining problem

## What was the breakthrough that moved the work forward?

The breakthrough was questioning my diagnosis that live updates were broken.
Twelve automated checks were green and earlier two-browser checks had passed,
but my own two-window attempt failed. Each window had created a different
plan, and both shared one browser identity. Another window was not another
person.

The Fly logs changed what I asked the agent to fix. I chose named rooms over
a join code or public room list so people could reach the same plan by typing
the same name
([`78d7972`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/78d7972),
[`570a815`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/570a815)).
This simplified entry, but anyone knowing the name could join as an editor.
The stream did not need replacing.

For competing edits, I retained version-checked saves rather than locking an
object. An outdated move is refused, preserving the accepted position; the
other participant must reconsider their placement. I accepted that lost effort
to avoid lock ownership and expiry rules
([decision 0001](../docs/decisions/0001-refuse-outdated-moves.md)).

## What did this work change about who I want to be as a software developer?

I want to become more precise about what evidence proves. The existing checks
established that people already in one plan could exchange changes. They did
not establish that someone starting at the home page would find another person.
My attempt exposed that assumption; the logs prevented a repair to the wrong
part of the application.

I also need to distinguish my judgement from the agent's. The agent caught
the stale drag-preview bug; I did not. It extended the version rule used for
saved moves, and the lesson became a harness rule
([`ca963f9`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/ca963f9),
[`553c7ac`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/553c7ac)).
My responsibility is to test the whole journey and challenge what a passing
check leaves unexamined.
