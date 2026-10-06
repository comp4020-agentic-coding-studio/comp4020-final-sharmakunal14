# Shared Space

Shared Space helps a small team arrange stalls in an event room together.
The first version is a fictional Campus Clubs Fair: four activities and a
walkway inside a 12 by 8 metre room. The question is whether collaborators
can try a layout, understand its problems, and return to the same saved plan
without losing one another's changes.

## Try the current version

Open [Shared Space](https://comp4020-final-sharmakunal14.fly.dev/), choose a
display name, and select **Create example event**. Share the plan's address
with someone using another browser or browser profile. Select an activity
and drag it, use the arrow keys or movement buttons, enter its coordinates,
or use **Tap the plan to place**. Move Robotics into the walkway to see a
named problem, then move it clear. Reopen the plan to inspect the saved
position.

Identity belongs to a browser session, with no password or verified account.
Clearing its cookie creates a new identity. Anyone holding a plan link can
join as an editor, so use this prototype for non-sensitive examples.

## What good means here

Good means collaborators can understand and negotiate a shared layout while
the software makes the consequences of their actions clear.

- **Respect saved work.** A move based on an outdated position must be refused with an explanation. A preview must only be described as saved after the server confirms it.
- **Make problems discussable.** An unfinished layout may overlap activities, obstruct the walkway or cross the room boundary. It should remain editable, with the affected activities named, rather than silently refusing the move. These geometric checks are not a venue-safety assessment.
- **Make collaboration understandable.** Saved changes should reach other open plans within about a second. People should be able to identify the last mover, recognise a disconnected view, and keep their selection and keyboard focus when updates arrive.
- **Let people choose how to move.** Dragging, keyboard input and clickable or tappable controls should offer equivalent access to positioning an activity.

Gutwin and Greenberg's [workspace-awareness framework](https://hcitang.org/uploads/Teaching/2002-DescriptiveFramework.JCSCW.pdf)
(2002, introduction, pp. 412–413) describes understanding other people's
activity in a shared workspace. I use it as a reason to judge whether movement
and attribution are understandable, rather than treating synchronised
coordinates alone as successful collaboration. It does not establish that
this interface is usable.

W3C's [guidance on dragging movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)
(intent and relationship to keyboard accessibility) distinguishes keyboard
support from a pointer alternative that needs no dragging. That supports
keeping buttons, coordinate fields and tap placement alongside arrow keys.
Having these controls is not evidence of full accessibility conformance.

## What is checked, and what still needs judgement

The automated application checks cover a saved move read by another session,
rejection of an outdated move, and receipt of a streamed update within one
second. They test HTTP behaviour, not what two people see in their browsers.
The supplied checks also cover the home page and this page's headings.

Focus preservation, clear conflict messages, keyboard and touch usability,
and whether the tool helps a team negotiate need direct observation. Those
standards are not yet established by user trials. Persistence across a server
restart or redeployment also needs a dedicated check.

## Deliberate limits

The prototype edits one example layout. Custom venues, equipment inventory,
private roles, undo and published versions are outside this first version.
I would rather establish whether this small shared interaction is dependable
before making the editor more general.
