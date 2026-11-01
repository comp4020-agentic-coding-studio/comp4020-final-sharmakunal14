# 0005 — Optional original retro audio

Date: 1 November 2026 (Australia/Sydney)
Status: Accepted for implementation.

## Context

The author requested Mario-like music and action sounds for the new 3D maze.
The intended quality is playful retro platform-game feedback. Audio must not
change movement, server authority, or access to the game without sound.

## Decision

Synthesize original short square/triangle-wave effects and a looping original
melody with the browser Web Audio API. No copied recordings or game melodies,
new packages, downloaded sound assets or external audio services are needed.

Start silent. Offer an explicit sound toggle and an independent music toggle,
remembered locally where browser storage permits. Create/resume audio only
from a user gesture; missing or blocked audio must leave gameplay usable.
Music runs only during a connected, visible live race. Hide/mute/disconnect
stops scheduled music; leaving the page disposes audio resources.

Walking and turning sound immediately with local presentation. A predicted step
can subsequently be refused: its sound is feedback, not proof of acceptance.
Shared flips and final results sound only on newer confirmed snapshots, once
per observed transition. Initial state and reconnect baselines are silent;
missed events are not replayed. Replays remain silent. Countdown cues follow
the displayed second, and repeat/refusal effects are rate-limited.

Bound voices and schedule music only a short distance ahead. Keep visual
status messages and controls complete: sound never carries exclusive information.

## Alternatives and trade-offs

- Bundled audio files offer richer timbre but require asset provenance, loading
  and extra bytes. Synthesis is sufficient for this narrow aesthetic.
- A music library adds lifecycle abstraction but another dependency. Native
  oscillators, gain envelopes and one bounded scheduler meet the current scope.
- Always-on audio would be easier to discover, but surprise sound and autoplay
  restrictions make explicit opt-in preferable.
- Snapshot comparison can miss two flips that cancel between observations.
  This is acceptable for decorative feedback; do not add a gameplay event
  protocol just to reconstruct missed sounds.

## Evidence to collect

Focused tests for deduplication, lifecycle, voice limits and unavailable audio;
browser checks of sound/music controls and mobile layout. Actual timbre,
repetition fatigue, device volume and usefulness require human listening.
Do not describe automated scheduling checks as a listening test.

Reference: [Web Audio API best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices).
