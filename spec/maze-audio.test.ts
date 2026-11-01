import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createAudio } from "../public/maze-audio.js";

class FakeNode {
  type = "";
  onended: (() => void) | null = null;
  gain = { value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() };
  frequency = { setValueAtTime: vi.fn() };
  connect = vi.fn();
  disconnect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}
const contexts: FakeContext[] = [];
class FakeContext {
  currentTime = 0;
  state = "suspended";
  destination = {};
  onstatechange: (() => void) | null = null;
  nodes: FakeNode[] = [];
  constructor() { contexts.push(this); }
  createGain() { return new FakeNode(); }
  createOscillator() { const node = new FakeNode(); this.nodes.push(node); return node; }
  resume = vi.fn(async () => { this.state = "running"; });
  close = vi.fn(async () => { this.state = "closed"; });
}
let audio: ReturnType<typeof createAudio>;
beforeEach(() => {
  contexts.length = 0;
  vi.useFakeTimers();
  vi.stubGlobal("AudioContext", FakeContext);
  audio = createAudio();
});
afterEach(() => { audio.dispose(); vi.useRealTimers(); vi.unstubAllGlobals(); });
async function enable() { audio.setEnabled(true); await audio.unlock(); return contexts[0]!; }

it("starts silent, creates only one context on gesture, and never queues locked cues", async () => {
  audio.setRacing(true);
  audio.play("win");
  await audio.unlock();
  expect(contexts).toHaveLength(0);
  audio.setMusic(false);
  const context = await enable();
  await audio.unlock();
  expect(contexts).toHaveLength(1);
  expect(context.nodes).toHaveLength(0);
  audio.play("step");
  expect(context.nodes).toHaveLength(2);
  expect(context.nodes[0]!.gain).toBeDefined();
});

it("rate-limits held-wall feedback and bounds simultaneous voices", async () => {
  const context = await enable();
  for (let i = 0; i < 100; i++) audio.play("bump");
  expect(context.nodes).toHaveLength(2);
  for (let i = 0; i < 100; i++) { context.currentTime += .3; audio.play("flip"); }
  expect(context.nodes).toHaveLength(24);
  for (const node of context.nodes) node.onended?.();
  context.currentTime += 1;
  audio.play("step");
  expect(context.nodes).toHaveLength(26);
});

it("runs music only while racing, and stops it independently of effects", async () => {
  const context = await enable();
  expect(vi.getTimerCount()).toBe(0);
  audio.setRacing(true);
  expect(vi.getTimerCount()).toBe(1);
  expect(context.nodes.length).toBeGreaterThan(0);
  audio.setMusic(false);
  expect(vi.getTimerCount()).toBe(0);
  expect(context.nodes.every(node => node.disconnect.mock.calls.length > 0)).toBe(true);
  const count = context.nodes.length;
  audio.play("flip");
  expect(context.nodes.length).toBe(count + 3);
  audio.setMusic(true);
  audio.setRacing(false);
  expect(vi.getTimerCount()).toBe(0);
});

it("silences hidden pages and mute, without replaying dropped effects", async () => {
  const context = await enable();
  audio.setRacing(true);
  audio.setVisible(false);
  expect(vi.getTimerCount()).toBe(0);
  const count = context.nodes.length;
  audio.play("win");
  expect(context.nodes).toHaveLength(count);
  audio.setEnabled(false);
  audio.setVisible(true);
  await vi.advanceTimersByTimeAsync(1000);
  expect(context.nodes).toHaveLength(count);
  expect(context.nodes.every(node => node.disconnect.mock.calls.length > 0)).toBe(true);
});

it("does not schedule a backlog after a long clock jump", async () => {
  const context = await enable();
  audio.setRacing(true);
  const before = context.nodes.length;
  context.currentTime = 600;
  await vi.advanceTimersByTimeAsync(100);
  expect(context.nodes.length - before).toBeLessThanOrEqual(2);
  audio.play("win");
  expect(vi.getTimerCount()).toBe(0);
  expect(context.nodes.at(-1)!.frequency.setValueAtTime).toHaveBeenCalled();
});

it("handles missing or denied audio without throwing into gameplay", async () => {
  const unavailable = vi.fn();
  audio = createAudio({ onUnavailable: unavailable, createContext: () => { throw new Error("unsupported"); } });
  await enable();
  expect(unavailable).toHaveBeenCalledOnce();
  expect(() => audio.play("flip")).not.toThrow();
  audio = createAudio({ onUnavailable: unavailable });
  // Resume is an instance method; reject the already-created context on retry.
  await enable();
  const context = contexts[0]!;
  context.state = "suspended";
  context.resume.mockRejectedValueOnce(new Error("autoplay denied"));
  await audio.unlock();
  expect(unavailable).toHaveBeenCalledTimes(2);
  expect(vi.getTimerCount()).toBe(0);
});

it("does not restart after mute while a resume promise is pending", async () => {
  const context = await enable();
  context.state = "suspended";
  let finish!: () => void;
  context.resume.mockImplementationOnce(() => new Promise<void>(resolve => {
    finish = () => { context.state = "running"; resolve(); };
  }));
  audio.setRacing(true);
  const pending = audio.unlock();
  audio.setEnabled(false);
  finish();
  await pending;
  expect(vi.getTimerCount()).toBe(0);
  expect(context.nodes).toHaveLength(0);
});

it("closes its context and timer on disposal and cannot be restarted", async () => {
  const context = await enable();
  audio.setRacing(true);
  audio.dispose();
  expect(context.close).toHaveBeenCalledOnce();
  expect(vi.getTimerCount()).toBe(0);
  audio.setEnabled(true);
  await audio.unlock();
  expect(contexts).toHaveLength(1);
  expect(vi.getTimerCount()).toBe(0);
});
