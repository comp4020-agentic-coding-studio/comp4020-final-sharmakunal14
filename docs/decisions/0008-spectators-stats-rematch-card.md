# 0008 — Spectator link, streak and personal best, rematch card, result screens

Date: 2 November 2026 (Australia/Sydney)
Status: implemented locally; not yet playtested by people.

## Context

The author asked for: a spectator link shown before the race, with map, 1st and
3rd person views of both players; a daily streak and personal best; a card that
tells the other player about a rematch; a result screen for the losing side
(only the winner had one); the avatar designer in front when creating a race;
and better use of the lobby's blank space.

## Decisions

- **The spectator link is a separate secret.** Each race has a random token,
  created the first time a player asks for it. `/watch/<token>` reads the race
  and streams it, with no session. It opens no player endpoint: a spectator
  cannot join, ready up, move, chat or rematch. The race id is not a token and
  is refused. Only the two players can fetch the token.
- **Spectators see the race, not the players' private fields.** `publicGame()`
  removes chat and rematch fields from everything sent to a spectator, in the
  snapshot, the stream and the replay for non-players.
- **Limits protect the server.** At most 20 spectators per race and 64 overall,
  separate from the 128 player streams, so a popular link cannot crowd out
  players. Spectators do not count as "online" players.
- **Cameras.** A spectator gets the same map, 3rd and 1st buttons and chooses
  which player to follow. Nothing they do is sent anywhere.
- **Streak is derived, not stored.** The streak counts consecutive Sydney days
  with a finished race for that player, computed from saved matches. It stays
  alive through today, so a streak is not shown as lost before the day ends.
  Personal best is the fastest win on a maze. Both are per browser identity
  (no accounts), so clearing the cookie loses them. The win screen says whether
  the race was a new personal best, comparing against earlier races only.
- **Result screens for everyone.** The winner keeps VICTORY and fireworks. The
  loser sees "<name> wins", a kind line and a gentle rain, no fireworks. A
  spectator sees the winner's name with confetti. None replays when a finished
  race is reloaded.
- **Rematch is announced.** The race records who asked first. The other player
  gets a card that slides in with a "Join now" button, announced politely to
  screen readers. Joining reuses the same rematch call, which returns the one
  new race for both.
- **The avatar designer opens in front** as a modal before creating or joining
  a race (once per visit), with "Edit your avatar" to reopen it. The lobby's
  lists moved under the maze so the two columns balance.

## Alternatives considered

- Spectators as seats or a third identity: rejected, it weakens "exactly two
  players" and needs accounts.
- A guessable spectator address (the race id): rejected, the id is also the
  players' invitation.
- Storing streaks in a table: rejected, deriving from matches cannot drift.

## Costs

- A spectator link is a bearer secret: anyone who has it can watch. It cannot be
  revoked. Spectators also see live positions, which is the point.
- A spectator watching live sees positions as the server saw them; there is no
  delay, so a spectator sitting next to a player could relay the maze. Acceptable
  for a friendly game.
- Streaks and bests belong to a cookie, not a person.
