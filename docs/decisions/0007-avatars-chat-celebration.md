# 0007 — Avatar looks, chat with reactions, and a win celebration

Date: 2 November 2026 (Australia/Sydney)
Status: implemented locally; not yet playtested by people.

## Context

The author asked for three things to make a race feel better: a delightful
ending for the winner, a small chat with instant reactions, and avatars each
player can customise (shape, colour and more).

## Decisions

- **Looks are data, not code.** A look is `{ shape, accessory, face, finish, hue }`
  from fixed lists plus an integer hue 0–359. The server validates it
  (`public/maze-look.js`, shared with the browser) and refuses anything else,
  so a look can never carry markup or an arbitrary CSS value. Unknown extra
  fields are dropped. Games saved before looks existed fall back to the A/B
  default colours.
- **Looks lock when the countdown starts.** A change is allowed only while the
  room is waiting, so a race and its replay always show the avatars that
  started it. The look never affects positions, speed or the winner.
- **Chat lives in the saved game.** Lines (text up to 80 characters, or one of
  eight named reactions) are stored with the game, newest 30 kept, and reach
  both players over the existing stream. Reactions are sent by name; the server
  stores only a known word. Only the two players may chat; one player is held to
  one line per 400 ms and five per 10 s. Text is shown with `textContent`
  only, and control and direction-override characters are removed.
- **Celebration is client-only.** Fireworks and confetti on a canvas for about
  seven seconds, for the winner only, and only for a win seen live (not when
  reloading a finished race). With reduced motion it is a still banner.

## Alternatives considered

- Free-text colour or emoji avatars: rejected, they need escaping and moderation.
- A separate chat channel or table: rejected, the saved game already reaches
  both players and survives reconnects with no new transport.
- Replaying chat in the replay: left out; chat is not part of the step log.

## Costs

- Chat is saved in the match JSON, so every state broadcast carries up to 30
  short lines. Acceptable at this size; revisit if lines grow.
- Anyone in a race can type text to their rival. Mitigations: two players only,
  rate limits, a local "Mute rival" button. No profanity filter and no reporting.
- The avatar designer adds a second small WebGL renderer in the lobby.
