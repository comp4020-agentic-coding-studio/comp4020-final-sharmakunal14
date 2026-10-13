# 1. When two people move the same activity, refuse the outdated move

Status: accepted (crit 9, week 10)

## Context

Shared Space lets anyone in a room move any activity. The question this record
settles is what happens when two people move **the same activity at about the
same time**, each starting from the position they last saw.

A move is a whole new position (`cx`, `cy`), not an edit to a document. Two
moves of the same stall cannot be combined into something either person meant:
taking Alice's x and Ben's y puts it somewhere nobody chose.

The README's definition of good makes two promises that pull on this decision:

- **Respect saved work.** A move based on an outdated position must be refused
  with an explanation.
- **Make collaboration understandable.** People should see who moved what, and
  recognise when their view is out of date.

## Options considered

1. **Last write wins.** The server applies every move in arrival order. Nobody
   ever sees an error, and it is the least code. But the earlier mover's
   position disappears silently; on a slow connection they may never notice it
   was overwritten. That breaks "respect saved work" outright.
2. **Lock the activity while someone has it.** Selecting or dragging takes an
   exclusive lock; others cannot move it until it is released. Conflicts cannot
   happen. But locks need expiry for closed tabs and dropped connections, a
   forgotten selection blocks a teammate, and keyboard and button users hold
   the lock for as long as the activity stays selected.
3. **Merge automatically** (operational transforms or a CRDT). Suited to text,
   where both edits can survive. For a single position there is nothing to
   merge, so in practice this reduces to last write wins with more machinery.
4. **Refuse the outdated move (chosen).** Every move carries the version it
   was based on. The server applies it only if that is still the current
   version; otherwise it answers 409 with where the activity actually is.

## Decision

Option 4, paired with live awareness so that conflicts are rare and legible:

- The server checks the version inside the same transaction that saves the
  move, so exactly one of two simultaneous moves wins
  ([`f30ad92`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/f30ad92)).
- The refused person's view jumps to the saved position, with a message naming
  who moved it and inviting them to move it again if they still want to.
- While someone drags, everyone else sees a dashed outline labelled with their
  name, and the activity list says "Alice is moving it"
  ([`2956543`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/2956543),
  [`7293ebc`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/7293ebc)).
  This is a soft signal, not a lock: it warns before the conflict instead of
  forbidding the move. The point follows Gutwin and Greenberg's argument that
  awareness of others' activity is what makes shared-workspace collaboration
  work.
- Drag outlines are never saved and carry their own version, so a late one
  cannot resurrect a position that has since been superseded
  ([`ca963f9`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/ca963f9)).

## Consequences

- Nobody's saved move is ever silently lost. The cost lands on the second
  mover, who has to look again and redo their move. I accept that, because a
  visible "someone moved this first" is a moment for the two people to
  negotiate, which is what the tool is for.
- Unlike a lock, nothing stops two people grabbing the same stall; the outline
  only makes it unlikely. If conflicts turn out to be frequent, a soft lock
  (warn, but allow override) is the next step, not a hard one.
- Checked: `spec/shared-space.test.ts` refuses an outdated move and keeps the
  saved position; `spec/live.test.ts` refuses an outdated drag preview. A
  two-browser run where both people nudged Film at the same moment ended with
  both screens showing the same position.
- Not yet shown: whether people understand the refusal message, and how often
  conflicts happen with a full room. Those need observation at the crit, not a
  check.
