import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { setupAudio } from "../public/maze-audio-ui.js";

const engine = vi.hoisted(() => ({ setEnabled: vi.fn(), setMusic: vi.fn(), setVisible: vi.fn(), setScene: vi.fn(),
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

it("is on by default, starts the lobby tune, and waits for a gesture before unlocking", () => {
  setupAudio();
  expect(input("sound-enabled").checked).toBe(true);
  expect(input("music-enabled").disabled).toBe(false);
  expect(engine.setEnabled).toHaveBeenLastCalledWith(true);
  expect(engine.setScene).toHaveBeenLastCalledWith("lobby");
  expect(engine.unlock).not.toHaveBeenCalled();
  document.dispatchEvent(new dom.window.Event("pointerdown"));
  expect(engine.unlock).toHaveBeenCalledOnce();
});

it("offers separate sound and music settings and saves only preferences", async () => {
  setupAudio();
  change("music-enabled", false);
  expect(engine.setMusic).toHaveBeenLastCalledWith(false);
  expect(JSON.parse(localStorage.getItem("maze-duel-audio-v1")!)).toEqual({ enabled: true, music: false });
  change("sound-enabled", false);
  await Promise.resolve();
  expect(engine.setEnabled).toHaveBeenLastCalledWith(false);
  expect(document.getElementById("audio-status")!.textContent).toBe("Sound off");
  expect(JSON.parse(localStorage.getItem("maze-duel-audio-v1")!).enabled).toBe(false);
});

it("has a visible mute button and an M key that toggle sound, except while typing", async () => {
  setupAudio();
  const mute = document.getElementById("mute-button") as HTMLButtonElement;
  expect(mute.getAttribute("aria-label")).toBe("Mute sound");
  mute.click();
  await Promise.resolve();
  expect(engine.setEnabled).toHaveBeenLastCalledWith(false);
  expect(mute.getAttribute("aria-label")).toBe("Turn sound on");
  expect(mute.getAttribute("aria-pressed")).toBe("true");
  document.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "m", bubbles: true }));
  await Promise.resolve();
  expect(engine.setEnabled).toHaveBeenLastCalledWith(true);
  const calls = engine.setEnabled.mock.calls.length;
  input("sound-enabled").dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "m", bubbles: true }));
  document.getElementById("nickname")!.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "m", bubbles: true }));
  expect(engine.setEnabled.mock.calls.length).toBe(calls);
});

it("remembers an explicit mute and stays silent next visit", () => {
  localStorage.setItem("maze-duel-audio-v1", '{"enabled":false,"music":true}');
  setupAudio();
  expect(input("sound-enabled").checked).toBe(false);
  expect(engine.setEnabled).toHaveBeenLastCalledWith(false);
  document.dispatchEvent(new dom.window.Event("pointerdown"));
  expect(engine.unlock).not.toHaveBeenCalled();
});

it("unlocks on a gesture and stops on hidden/page exit", () => {
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
  expect(input("sound-enabled").checked).toBe(true);
  vi.stubGlobal("localStorage", { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } });
  change("sound-enabled", false);
  await Promise.resolve();
  await Promise.resolve();
  expect(document.getElementById("audio-note")!.textContent).toContain("cannot save");
});
