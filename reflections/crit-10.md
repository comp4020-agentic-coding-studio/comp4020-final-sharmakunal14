# Crit 10 — Testing the local prototype

*Revised retrospectively on 9 November 2026; this describes local concept validation at Crit 10.*

## What was the breakthrough that moved the work forward?

At Crit 10, I was trying Maze Duel locally to see whether the idea was worth
pursuing. Friends liked competing and the switches, but asked for smoother
controls and suggested different camera views. Their response was useful
because liking the idea did not mean they were satisfied with playing it.

I used that feedback to direct the next changes. Later commits added movement
prediction and batching
([`e5231c7`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/e5231c7))
and map, third-person and first-person views
([`d77f9ea`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/d77f9ea)).
Those commits show what was built. They do not tell me whether it felt better
to the friends who raised the issue. I still need that follow-up, and this
informal session tells me little about balanced competition or lasting interest.

## What did this work change about who I want to be as a software developer?

I need to follow a suggestion through to another attempt by the person who
made it. Adding camera buttons is easy to point to; finding out whether they
help someone navigate takes another conversation and another race.

The local session also left part of Crit 10 unaccounted for. I cannot use it
as evidence of two classmates using only the deployed URL while I followed
their actions in server logs. Cookie identities and membership checks need
separate testing. Maze action logging was added later, on 9 November
([`27ce3b3`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/27ce3b3)),
so that commit cannot fill the gap in my crit account.

For the next play session, I would ask the same friends to try the revised
controls and views, watch where they hesitate, and ask what still feels awkward.
