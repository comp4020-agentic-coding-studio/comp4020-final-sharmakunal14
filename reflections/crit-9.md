# Crit 9 — Finding the joining problem

## What was the breakthrough that moved the work forward?

I initially thought live updates were broken. Twelve automated checks were
passing, as had earlier two-browser checks, but I could not reproduce
collaboration in two windows. The logs showed that I had created different
plans, and both windows shared one browser identity. I was testing neither
the same plan nor two separate people.

That changed what I asked the agent to fix. I chose named rooms over a join
code or public list: entering the same name would bring people to the same plan
([`78d7972`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/78d7972),
[`570a815`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/570a815)).
Entry was simpler, although anyone who knew the name could join as an editor.
Replacing the stream would have left the joining problem untouched.

For simultaneous edits, I kept version checks instead of locking objects.
A refused move wastes some effort because the person must try again, but this
avoids deciding who owns a lock and when it expires
([decision 0001](../docs/decisions/0001-refuse-outdated-moves.md)).

## What did this work change about who I want to be as a software developer?

I had given the passing checks more credit than they deserved. They started
with people already sharing a plan, so they skipped the part I got wrong.
I need to test from the home page with separate browser identities before
calling collaboration finished.

The agent also found a stale drag-preview bug that I had missed. The fix
extended version checks to previews, and the harness recorded that rule
([`ca963f9`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/ca963f9),
[`553c7ac`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/553c7ac)).
That was useful help, but my own failed attempt exposed a different gap.
Next time I see a green suite and a broken interaction, I will compare the
test's starting conditions with what I actually did before asking for a rewrite.
