# Crit 9 — Finding the joining problem

## What was the breakthrough that moved the work forward?

The breakthrough was questioning my diagnosis that live updates were broken.
Twelve automated checks were green and the earlier two-browser checks had
passed, but my own two-window attempt still failed. The investigation showed
that each window had created a different plan. They also shared one browser
identity, so opening another window did not create another person.

The Fly logs changed what I asked the agent to fix. I chose named rooms over
a join code or public room list: people could type the same name and reach
the same plan. The change belonged in joining and navigation; the stream did
not need replacing
([`78d7972`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/78d7972),
[`570a815`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/570a815)).
Asking whether everything was implemented also exposed outdated README
instructions. Finishing meant making the route into collaboration understandable.

## What did this work change about who I want to be as a software developer?

I want to become more precise about what evidence proves. The existing checks
established that people already in one plan could exchange changes. They did
not establish that someone starting at the home page would find another person.
My test exposed that missing assumption; reading the logs prevented a repair
to the wrong part of the application.

I also need to distinguish my judgement from the agent's. The agent caught
the stale drag-preview bug; I did not. It extended the version rule already
used for saved moves, and the lesson became a harness rule
([`ca963f9`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/ca963f9),
[`553c7ac`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/553c7ac)).
My responsibility is to test the whole journey and decide which assumptions
the next checks must challenge.
