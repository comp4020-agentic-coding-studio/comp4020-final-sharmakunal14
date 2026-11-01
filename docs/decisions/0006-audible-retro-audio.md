# 0006 — Audible, on-by-default Mario-style audio

Date: 2 November 2026 (Australia/Sydney)
Status: accepted; implementation in progress. Amends
[0005](0005-retro-audio.md): "start silent", "music only while racing" and
the effect levels are superseded; the rest (synthesised, original, bounded,
silent when hidden) stands.

## Context

The author reported the audio "isn't working" and asked for music and effects
resembling a classic platform game: constant engaging background music, and an
appropriate sound for moving, flipping, winning and key presses.

Measured in real Chrome with a tap on the speaker output:
- The engine did start (context `running`) and scheduled notes.
- Every effect peaked at 0.03–0.08 and averaged about 0.005, so on a laptop
  the sound was close to inaudible.
- Nothing played until the user found a small "Sound off" menu and ticked a
  box; the lobby and waiting room were silent.
- The tunes were two-to-six-note beeps with one eight-bar loop.

## Decisions

- **Louder.** Raise master and voice levels so effects peak above 0.25 and
  music sits clearly under them.
- **On by default, constant.** Music plays in the lobby, waiting room,
  countdown and race, with a different tune per scene. It starts on the first
  click or key press, because browsers block earlier sound; nothing can
  bypass that.
- **A visible mute button** in the top bar replaces the hidden menu as the
  main control. The menu keeps the music/effects split.
- **A richer sound palette,** all original and synthesised: a bright square
  lead with vibrato, triangle bass, noise-burst drums, and per-action sounds
  (jump-style step, coin-style flip, bump, power-up on ready, countdown
  beeps, race-start fanfare, win jingle, lose descent, camera blip).
- **Consent.** An explicit mute choice is remembered and respected. First-time
  visitors hear sound after their first gesture, and the mute button is always
  visible.

## Alternatives rejected

- Copy a real Mario tune or sample: a copyright issue, and the project
  forbids copied melodies. The result is "in the style of", not a copy.
- Recorded audio files: assets with unclear provenance and extra bytes.
- Autoplay on load: impossible, and the browser would block it.

## Consequences

- Sound on by default surprises some people; the mute button and the stored
  choice are the mitigation.
- Original tunes only resemble the genre; whether they feel Mario-like is a
  human judgement, and automated loudness checks cannot confirm it.
- Looping music can tire; two bounded variations per scene limit that, and a
  human listening session is still owed.
