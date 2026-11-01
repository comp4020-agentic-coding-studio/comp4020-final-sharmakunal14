import { JSDOM } from "jsdom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { setupControls } from "../public/maze-controls.js";

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
  const move = vi.fn(async () => {});
  setupControls(() => true, move);
  dom.window.document.querySelector("input")!.dispatchEvent(key("keydown", "w", "KeyW"));
  await vi.advanceTimersByTimeAsync(500);
  expect(move).not.toHaveBeenCalled();
});

it("keeps one command in flight and discards held input on blur or disconnection", async () => {
  let complete: (() => void) | undefined;
  let connected = true;
  const move = vi.fn(() => new Promise<void>((resolve) => { complete = resolve; }));
  setupControls(() => connected, move);
  document.dispatchEvent(key("keydown", "ArrowRight", "ArrowRight"));
  await vi.advanceTimersByTimeAsync(1_000);
  expect(move).toHaveBeenCalledTimes(1);
  window.dispatchEvent(new dom.window.Event("blur"));
  complete!();
  await vi.advanceTimersByTimeAsync(500);
  expect(move).toHaveBeenCalledTimes(1);
  document.dispatchEvent(key("keydown", "ArrowRight", "ArrowRight"));
  expect(move).toHaveBeenCalledTimes(2);
  connected = false;
  complete!();
  await vi.advanceTimersByTimeAsync(500);
  connected = true;
  await vi.advanceTimersByTimeAsync(500);
  expect(move).toHaveBeenCalledTimes(2);
});

it("supports assistive button activation without starting a repeating move", async () => {
  const move = vi.fn(async () => {});
  setupControls(() => true, move);
  document.querySelector("button")!.click();
  await vi.advanceTimersByTimeAsync(1_000);
  expect(move).toHaveBeenCalledExactlyOnceWith("right");
});
