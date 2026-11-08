# Crit 10 — Testing the local prototype

*Revised retrospectively on 9 November 2026; this describes local concept validation at Crit 10.*

## What was the breakthrough that moved the work forward?

At Crit 10, I had started building Maze Duel locally to validate the concept.
The breakthrough was getting feedback that separated interest in the idea from
the quality of playing it. Friends liked competing and the switch concept,
but asked for smoother controls and suggested different camera perspectives.

That gave me a specific direction for the next iteration. Their feedback
informed control changes and the camera options. Later implementation records
show movement prediction and batching
([`e5231c7`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/e5231c7))
and map, third-person and first-person views
([`d77f9ea`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/d77f9ea)).
The lesson was that a race could function correctly while its controls still
made the experience less satisfying.

This was informal feedback on a local prototype. It supports the concept's
appeal to those players; it does not establish balanced competition, sustained
interest, or that the later changes resolved their concerns.

## What did this work change about who I want to be as a software developer?

I want to become a developer who turns criticism into a specific change, then
asks people to try it again. Implementing a suggestion is only part of that loop.

I also need to keep different kinds of evidence separate. Maze Duel uses cookie
identities and server-side membership checks; those boundaries need testing
with separate identities. The local feedback session does not demonstrate the
deployed URL-only, log-narration exercise. Maze action logging was added later,
on 9 November
([`27ce3b3`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/27ce3b3));
that commit is implementation evidence, not a record of observations at the crit.

My responsibility is to judge both whether the agent built the rules correctly
and whether those rules produce an experience people want to use.
