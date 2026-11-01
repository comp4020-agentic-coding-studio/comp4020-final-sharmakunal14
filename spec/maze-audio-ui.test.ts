import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { setupAudio } from "../public/maze-audio-ui.js";

const engine = vi.hoisted(() => ({ setEnabled: vi.fn(), setMusic: vi.fn(), setVisible: vi.fn(),
  unlock: vi.fn(async () => {}), play: vi.fn(), dispose: vi.fn() }));
vi.mock("../public/maze-audio.js", () => ({ createAudio: () => engine }));
let dom: JSDOM;
beforeEach(() => {
  vi.clearAllMocks();
  dom = new JSDOM(readFileSync("public/maze.html", "utf8"), { url: "https://maze.test/" });
  vi.stubGlobal("document", dom.window.document);
  vi.stubGlobal("window", dom.window);
  vi.stubGlobal("localStorage", dom.window.localStorage);
});
afterEach(() => { dom.window.close(); vi.unstubAllGlobals(); });
const input = (id: string) => document.getElementById(id) as HTMLInputElement;
const change = (id: string, checked: boolean) => {
  input(id).checked = checked;
  input(id).dispatchEvent(new dom.window.Event("change"));
};

it("offers separate sound and music settings and saves only preferences", async () => {
  setupAudio();
  expect(input("sound-enabled").checked).toBe(false);
  expect(input("music-enabled").disabled).toBe(true);
  expect(engine.unlock).not.toHaveBeenCalled();
  change("sound-enabled", true);
  await Promise.resolve();
  expect(engine.unlock).toHaveBeenCalledOnce();
  expect(input("music-enabled").disabled).toBe(false);
  expect(document.getElementById("audio-status")!.textContent).toBe("Sound on");
  change("music-enabled", false);
  expect(engine.setMusic).toHaveBeenLastCalledWith(false);
  expect(JSON.parse(localStorage.getItem("maze-duel-audio-v1")!)).toEqual({ enabled: true, music: false });
  change("sound-enabled", false);
  expect(engine.setEnabled).toHaveBeenLastCalledWith(false);
});

it("waits for a gesture with saved consent and stops on hidden/page exit", () => {
  localStorage.setItem("maze-duel-audio-v1", '{"enabled":true,"music":false}');
  setupAudio();
  expect(engine.unlock).not.toHaveBeenCalled();
  document.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "w" }));
  expect(engine.unlock).toHaveBeenCalledOnce();
  document.dispatchEvent(new dom.window.Event("visibilitychange"));
  expect(engine.setVisible).toHaveBeenLastCalledWith(false); // jsdom starts hidden.
  window.dispatchEvent(new dom.window.Event("pagehide"));
  expect(engine.dispose).toHaveBeenCalledOnce();
});

it("survives malformed or unavailable preference storage", async () => {
  localStorage.setItem("maze-duel-audio-v1", "{broken");
  expect(() => setupAudio()).not.toThrow();
  expect(input("sound-enabled").checked).toBe(false);
  vi.stubGlobal("localStorage", { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } });
  change("sound-enabled", true);
  await Promise.resolve();
  expect(document.getElementById("audio-note")!.textContent).toContain("cannot save");
});
