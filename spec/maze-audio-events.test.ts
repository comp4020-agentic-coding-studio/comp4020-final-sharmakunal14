import { expect, it } from "vitest";
import { raceCues } from "../public/maze-audio-events.js";

const racing = { revision: 4, status: "racing", winnerId: null as string | null,
  switchOn: [false, false], players: [{ id: "me", ready: true }] };

it("ignores duplicate and older snapshots even when their contents differ", () => {
  expect(raceCues(racing, { ...racing, switchOn: [true, false] }, "me")).toEqual([]);
  expect(raceCues(racing, { ...racing, revision: 3, status: "finished", winnerId: "me" }, "me")).toEqual([]);
});

it("sounds a confirmed shared flip once, regardless of who flipped", () => {
  const next = { ...racing, revision: 5, switchOn: [true, false] };
  expect(raceCues(racing, next, "me")).toEqual(["flip"]);
  expect(raceCues(next, { ...next, revision: 6 }, "me")).toEqual([]);
});

it("announces only transitions into a result, with different winner and loser cues", () => {
  const finish = { ...racing, revision: 5, status: "finished", winnerId: "me" };
  expect(raceCues(racing, finish, "me")).toEqual(["win"]);
  expect(raceCues(racing, finish, "rival")).toEqual(["lose"]);
  expect(raceCues(finish, { ...finish, revision: 6 }, "me")).toEqual([]);
  expect(raceCues(racing, { ...racing, revision: 5, status: "interrupted" }, "me")).toEqual(["end"]);
});

it("distinguishes ready acknowledgement from the shared start", () => {
  const waiting = { ...racing, status: "waiting", players: [{ id: "me", ready: false }] };
  expect(raceCues(waiting, { ...waiting, revision: 5, players: racing.players }, "me")).toEqual(["ready"]);
  expect(raceCues({ ...racing, status: "countdown" }, { ...racing, revision: 5 }, "me")).toEqual(["go"]);
});
