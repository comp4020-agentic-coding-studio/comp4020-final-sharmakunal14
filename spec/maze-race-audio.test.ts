import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mountRace } from "../public/maze-race.js";
import { setupViews } from "../public/maze-views.js";
import { ApiError } from "../public/maze-api.js";

const request = vi.hoisted(() => vi.fn());
vi.mock("../public/maze-api.js", async importOriginal => ({
  ...await importOriginal<typeof import("../public/maze-api.js")>(), request,
}));
const streams: FakeStream[] = [];
class FakeStream {
  onerror: (() => void) | null = null;
  listener?: (event: { data: string }) => void;
  constructor() { streams.push(this); }
  addEventListener(_name: string, listener: (event: { data: string }) => void) { this.listener = listener; }
  emit(game: ReturnType<typeof state>) { this.listener?.({ data: JSON.stringify(snapshot(game)) }); }
  close() {}
}
const state = (revision = 1, status = "racing", switchOn = [false]) => ({
  id: "race", revision, status, switchOn, winnerId: "me", interruption: null,
  maze: ["#####", "#...#", "#...#", "#...#", "#####"], gates: [], switches: [{ x: 1, y: 1 }],
  startsAt: 3000, finishedAt: status === "finished" ? 5000 : null,
  players: [{ id: "me", name: "Me", slot: 0, x: 1, y: 1, ready: true, sequence: 0 },
    { id: "rival", name: "Rival", slot: 1, x: 3, y: 3, ready: true, sequence: 0 }],
});
const snapshot = (game: ReturnType<typeof state>) => ({ game, me: "me", serverNow: 0, online: ["me", "rival"] });
let dom: JSDOM;
const audio = { play: vi.fn(), setScene: vi.fn() };
const view = { update: vi.fn(), view: "overview", turn: vi.fn(), facing: () => "right" };
beforeEach(() => {
  vi.clearAllMocks();
  streams.length = 0;
  view.view = "overview";
  dom = new JSDOM(readFileSync("public/maze.html", "utf8"), { url: "https://maze.test/race/race", pretendToBeVisual: true });
  vi.stubGlobal("document", dom.window.document);
  vi.stubGlobal("window", dom.window);
  vi.stubGlobal("location", dom.window.location);
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  vi.stubGlobal("EventSource", FakeStream);
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "performance"] });
  request.mockImplementation(() => new Promise(() => {}));
});
afterEach(() => {
  window.dispatchEvent(new dom.window.Event("pagehide"));
  vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); dom.window.close();
});
const press = (direction: string) => (document.querySelector(`[data-direction="${direction}"]`) as HTMLButtonElement).click();

it("keeps initial/reconnected results silent and plays a live result only once", () => {
  mountRace(snapshot(state()), view, vi.fn(), audio);
  const stream = streams[0]!;
  stream.emit(state());
  expect(audio.play).not.toHaveBeenCalled();
  stream.emit(state(2, "racing", [true]));
  stream.emit(state(2, "racing", [true]));
  expect(audio.play.mock.calls).toEqual([["flip"]]);
  stream.emit(state(3, "finished", [true]));
  stream.emit(state(3, "finished", [true]));
  expect(audio.play.mock.calls).toEqual([["flip"], ["win"]]);
  expect(audio.setScene).toHaveBeenLastCalledWith("off"); // a result hands over to the jingle
  stream.onerror?.();
  expect(audio.setScene).toHaveBeenLastCalledWith("off"); // a lost connection silences the music
  audio.play.mockClear();
  stream.emit(state(4, "finished"));
  expect(audio.play).not.toHaveBeenCalled();
});

it("sounds predicted walking and local turning, but waits for a flip confirmation", async () => {
  mountRace(snapshot(state()), view, vi.fn(), audio);
  streams[0]!.emit(state());
  press("flip");
  expect(audio.play).not.toHaveBeenCalled();
  streams[0]!.emit(state(2, "racing", [true]));
  expect(audio.play).toHaveBeenLastCalledWith("flip");
  await vi.advanceTimersByTimeAsync(150);
  press("right");
  expect(audio.play).toHaveBeenLastCalledWith("step");
  await vi.advanceTimersByTimeAsync(150);
  view.view = "third";
  press("left");
  expect(view.turn).toHaveBeenCalledWith("left");
  expect(audio.play).toHaveBeenLastCalledWith("turn");
});

it("ticks once per displayed countdown second and announces the server start", async () => {
  mountRace(snapshot(state(1, "waiting")), view, vi.fn(), audio);
  streams[0]!.emit(state(1, "waiting"));
  streams[0]!.emit(state(2, "countdown"));
  await vi.advanceTimersByTimeAsync(3000);
  expect(audio.play.mock.calls).toEqual([["tick"], ["tick"], ["tick"]]);
  streams[0]!.emit(state(3));
  expect(audio.play).toHaveBeenLastCalledWith("go");
  expect(audio.setScene).toHaveBeenLastCalledWith("race");
});

it("follows the game with a different tune per phase, and silences it when disconnected", () => {
  mountRace(snapshot(state(1, "waiting")), view, vi.fn(), audio);
  const stream = streams[0]!;
  stream.emit(state(1, "waiting"));
  expect(audio.setScene).toHaveBeenLastCalledWith("waiting");
  stream.emit(state(2, "countdown"));
  expect(audio.setScene).toHaveBeenLastCalledWith("countdown");
  stream.emit(state(3));
  expect(audio.setScene).toHaveBeenLastCalledWith("race");
  stream.onerror?.();
  expect(audio.setScene).toHaveBeenLastCalledWith("off");
});

it("gives refusal feedback without claiming a rejected flip succeeded", async () => {
  request.mockRejectedValueOnce(new ApiError("Switch cooling down", "SWITCH_COOLDOWN", 409, snapshot(state())));
  mountRace(snapshot(state()), view, vi.fn(), audio);
  streams[0]!.emit(state());
  press("up"); // A local wall refusal does not send a request.
  expect(audio.play).toHaveBeenLastCalledWith("bump");
  expect(request).not.toHaveBeenCalled();
  audio.play.mockClear();
  press("flip");
  await Promise.resolve();
  await Promise.resolve();
  expect(audio.play.mock.calls).toEqual([["bump"]]);
  expect(document.getElementById("announcement")!.textContent).toBe("Switch cooling down");
});

it("does not sound a camera cue on setup, unchanged selection or a repeated key", () => {
  const camera = { view: "overview", setView(name: string) { this.view = name; } };
  const cue = vi.fn();
  setupViews(camera, cue);
  (document.querySelector('[data-view="overview"]') as HTMLButtonElement).click();
  expect(cue).not.toHaveBeenCalled();
  document.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "v" }));
  expect(cue).toHaveBeenCalledOnce();
  document.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "v", repeat: true }));
  expect(cue).toHaveBeenCalledOnce();
});

it("clicks for the interface buttons the player presses", async () => {
  mountRace(snapshot(state(1, "waiting")), view, vi.fn(), audio);
  streams[0]!.emit(state(1, "waiting"));
  audio.play.mockClear();
  (document.getElementById("copy-link") as HTMLButtonElement).click();
  expect(audio.play).toHaveBeenCalledWith("click");
});

it("plays a rising whoosh when the player steps onto the goal portal", async () => {
  const near = state();
  near.players[0] = { ...near.players[0]!, x: 2, y: 3 };
  mountRace(snapshot(near), view, vi.fn(), audio);
  streams[0]!.emit(near);
  audio.play.mockClear();
  press("right");
  expect(audio.play.mock.calls.map((c) => c[0])).toEqual(["step", "portal"]);
});
