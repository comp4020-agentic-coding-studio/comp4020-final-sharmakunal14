import { JSDOM } from "jsdom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createSender, setupControls } from "../public/maze-controls.js";

let dom: JSDOM;
beforeEach(() => {
  dom = new JSDOM('<input id="name"><button data-direction="right">Move right</button>');
  vi.stubGlobal("document", dom.window.document);
  vi.stubGlobal("window", dom.window);
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "performance"] });
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  dom.window.close();
});

const key = (type: string, value: string, code: string) => new dom.window.KeyboardEvent(type, { key: value, code, bubbles: true });

it("does not turn typing a nickname into movement", async () => {
  const act = vi.fn();
  setupControls(() => true, act);
  dom.window.document.querySelector("input")!.dispatchEvent(key("keydown", "w", "KeyW"));
  await vi.advanceTimersByTimeAsync(500);
  expect(act).not.toHaveBeenCalled();
});

it("leaves Space on the sound disclosure to the browser instead of flipping a gate", () => {
  const details = document.createElement("details");
  details.innerHTML = "<summary>Sound off</summary>";
  document.body.append(details);
  const act = vi.fn();
  setupControls(() => true, act);
  const event = new dom.window.KeyboardEvent("keydown", { key: " ", code: "Space", bubbles: true, cancelable: true });
  details.querySelector("summary")!.dispatchEvent(event);
  expect(act).not.toHaveBeenCalled();
  expect(event.defaultPrevented).toBe(false);
});

it("repeats a held key at the movement interval and stops on blur or disconnection", async () => {
  let connected = true;
  const act = vi.fn();
  setupControls(() => connected, act, 140);
  document.dispatchEvent(key("keydown", "ArrowRight", "ArrowRight"));
  await vi.advanceTimersByTimeAsync(700);
  expect(act.mock.calls.length).toBeGreaterThanOrEqual(4);
  expect(act.mock.calls.length).toBeLessThanOrEqual(6);
  window.dispatchEvent(new dom.window.Event("blur"));
  const afterBlur = act.mock.calls.length;
  await vi.advanceTimersByTimeAsync(500);
  expect(act).toHaveBeenCalledTimes(afterBlur);
  document.dispatchEvent(key("keydown", "ArrowRight", "ArrowRight"));
  connected = false;
  await vi.advanceTimersByTimeAsync(500);
  expect(act).toHaveBeenCalledTimes(afterBlur + 1);
});

it("does not wait out the interval after a locally refused step", async () => {
  const act = vi.fn((action: string) => action !== "up" ? undefined : false);
  setupControls(() => true, act, 140);
  document.dispatchEvent(key("keydown", "ArrowUp", "ArrowUp"));
  document.dispatchEvent(key("keyup", "ArrowUp", "ArrowUp"));
  document.dispatchEvent(key("keydown", "ArrowRight", "ArrowRight"));
  expect(act.mock.calls.map((c) => c[0])).toEqual(["up", "right"]);
});

it("supports assistive button activation without starting a repeating move", async () => {
  const act = vi.fn();
  setupControls(() => true, act);
  document.querySelector("button")!.click();
  await vi.advanceTimersByTimeAsync(1_000);
  expect(act).toHaveBeenCalledExactlyOnceWith("right");
});

it("batches actions queued during a slow request, numbering them without gaps", async () => {
  const sent: [string[], number][] = [];
  let finish: ((value: number | null) => void) | undefined;
  const sender = createSender((actions: string[], sequence: number) => {
    sent.push([actions, sequence]);
    return new Promise<number | null>((resolve) => { finish = resolve; });
  });
  sender.push("right");
  sender.push("right");
  sender.push("down");
  expect(sent).toEqual([[["right"], 1]]);
  expect(sender.unconfirmed).toEqual(["right", "right", "down"]);
  finish!(1);
  await vi.waitFor(() => expect(sent).toHaveLength(2));
  expect(sent[1]).toEqual([["right", "down"], 2]);
  finish!(3);
  await vi.waitFor(() => expect(sender.unconfirmed).toEqual([]));
});

it("drops predictions after a refused action and never reuses a sequence number", async () => {
  const sent: [string[], number][] = [];
  let finish: ((value: number | null) => void) | undefined;
  const sender = createSender((actions: string[], sequence: number) => {
    sent.push([actions, sequence]);
    return new Promise<number | null>((resolve) => { finish = resolve; });
  });
  sender.push("right");
  sender.push("down");
  finish!(1);
  await vi.waitFor(() => expect(sent).toHaveLength(2));
  sender.push("left");
  finish!(1);
  await vi.waitFor(() => expect(sender.unconfirmed).toEqual([]));
  sender.push("up");
  expect(sent.at(-1)).toEqual([["up"], 2]);
  sender.clear();
  finish!(2);
  await vi.waitFor(() => expect(sender.unconfirmed).toEqual([]));
  sender.push("up");
  expect(sent.at(-1)).toEqual([["up"], 3]);
});
