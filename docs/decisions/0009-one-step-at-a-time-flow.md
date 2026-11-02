# 0009 One step at a time: landing and flow redesign

Status: accepted (2026-11-02)

## Context
The lobby showed everything at once: nickname, create, join, stats, today's
lists and how-to-play. The player said it felt cluttered and asked for one
step per screen with smooth transitions.

## Decision
- The 3D maze is full-bleed behind everything and slowly rotates when idle.
- One floating card at a time (left on desktop, bottom sheet on phones), with
  panes that slide: name, plan (create or join), join link.
- The avatar designer is its own step with Back and a labelled continue button.
- A five-part step indicator (You, Plan, Avatar, Invite, Ready) shows progress.
- Leaderboard and how-to-play moved into dialogs opened on request.
- Spectator link sits in a collapsed `<details>` in the waiting room.
- Errors appear beside the field they belong to, with the fix.
- A player who already holds a seat and opens the race link goes straight in.

## Alternatives
Tabs on one page (still shows everything); a separate page per step (loses
the shared maze backdrop and slows transitions).

## Consequences
Removed ids (`entry-form`, `position`, the how-to-play section); the lobby
markup test was rewritten. Slide transitions respect reduced motion.
Not human-tested; checked only by agent-driven Chrome runs.
