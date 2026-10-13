# 1. Refuse an outdated move when people move the same activity

Status: accepted for Crit 9, 14 October 2026. This retains the save rule
implemented at Crit 8 and explains how this week's live previews support it.

## The decision I need to make

Shared Space lets everyone in a room move its activities. If Alice and Ben
both start from version 4 of Film and choose different positions, what should
happen when both try to save?

The [README](../../README.md) says to respect saved work and make collaboration
understandable. Competing changes should be visible, but the first mover does
not own Film afterwards. Someone using its new position can move it again.

The unit of change here is a complete position, `cx` and `cy`. Combining
the participants' coordinates or averaging their destinations could produce
a position neither chose.

## Alternatives and what they cost

| Option | What it offers | Why I did not choose it for this version |
| --- | --- | --- |
| Accept every move in arrival order | Simple handling; neither participant retries | A delayed request can silently replace a newer position. Arrival order does not establish the group's intention. |
| Lock an activity during an edit | Exclusive editing prevents competing saves while the lock is valid | Requires acquisition, release and expiry rules, including disconnected holders and consistent edit boundaries across input methods. |
| Automatically combine concurrent moves | Replicas can converge under a merge policy | Convergence does not identify the intended destination. Preserving alternatives or combining movement deltas would change the current absolute-position interaction. |
| Refuse an outdated move | The saved position survives the stale request; the second person sees a conflict | The second person loses their attempted placement and must reconsider it. I accept this cost for now. |

Locking is the strongest counterproposal: if people repeatedly compete for the
same stall, preventing wasted work may be better than rejecting it afterwards.
A short lease acquired for an explicit edit could avoid holding a lock for an
entire selection. Conflict frequency is unmeasured. For now, I prefer one rule
for dragging, buttons and coordinate entry without ownership and expiry logic.

## Chosen behaviour

Each save includes the object version it started from. The server compares
that version inside the same SQLite transaction that updates the position,
increments its version and records the change. With two otherwise valid
requests based on the same current version, the first committed save succeeds;
the other gets HTTP 409 and the current object
([`f30ad92`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/f30ad92)).

The client restores the returned position and explains that the attempted move
was not saved, inviting a retry. It says "someone else" when the conflict
response lacks the display name carried by successful move updates.

Presence and labelled drag outlines let people notice activity before saving
([`2956543`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/2956543),
[`7293ebc`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/7293ebc)).
They are advisory: an outline neither reserves the stall nor prevents another
person moving it. Gutwin and Greenberg's
[workspace-awareness framework](https://hcitang.org/uploads/Teaching/2002-DescriptiveFramework.JCSCW.pdf)
(2002, pp. 412–413) supports examining how people understand others' actions;
it does not establish that these particular outlines reduce conflicts.

Preview requests also carry a base version. The server refuses one processed
after that version has been superseded, and a rejected save withdraws its
author's preview ([`ca963f9`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/ca963f9)).
Previews and presence are not stored in durable history. A connecting view
receives current temporary state, rather than replaying past drags. Saved
moves remain eligible for catch-up; the current server caps that replay at
500 records per connection. Recovery after a longer gap is not established.

## Evidence and remaining uncertainty

[The save checks](../../spec/shared-space.test.ts) verify that a stale request
receives 409 and leaves the accepted position intact.
[The live checks](../../spec/live.test.ts) cover stale-preview rejection,
preview cancellation, presence, delivery and replay of missed saved moves.
The stale-save test sends requests sequentially; it is not a stress test of
many simultaneous writers.

The development-session record reports two browsers nudging Film together
converging on one position, plus passing live-feature, restart/reconnect and
named-room browser runs. These are author/agent checks; raw outputs are not
committed, and `spec/` does not run a browser.

The bounded guarantee is that a save based on an outdated version cannot
overwrite the current position. A later valid move can change it. This is
neither undo nor protection against a disruptive participant: anyone with the
room name or link can currently join as an editor.

At the crit I need to observe whether people understand the refusal and recover
without losing track of the plan. Repeated interruptions would justify revisiting
an edit lease or a warning with an override. I have no evidence yet that
awareness makes conflicts rare.
