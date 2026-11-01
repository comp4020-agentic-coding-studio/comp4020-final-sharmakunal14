import { JSDOM } from "jsdom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { celebrate } from "../public/maze-celebrate.js";
import { setupChat } from "../public/maze-chat.js";
import { readFileSync } from "node:fs";

let dom: JSDOM;
beforeEach(() => {
  dom = new JSDOM(readFileSync("public/maze.html", "utf8"), { pretendToBeVisual: true });
  vi.stubGlobal("document", dom.window.document);
  vi.stubGlobal("window", dom.window);
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  dom.window.HTMLCanvasElement.prototype.getContext = (() => new Proxy({}, { get: () => () => {}, set: () => true })) as never;
});
afterEach(() => { vi.unstubAllGlobals(); dom.window.close(); });

it("shows only a still banner when motion is reduced, and no animated canvas", () => {
  const stage = document.querySelector(".stage")!;
  const fx = celebrate(stage as HTMLElement, { reducedMotion: true });
  expect(stage.querySelector(".win-banner")).not.toBeNull();
  expect(stage.querySelector("canvas.win-fx")).toBeNull();
  fx.stop();
  expect(stage.querySelector(".win-banner")).toBeNull();
});

it("adds a canvas and banner, hides both from assistive technology, and removes them on stop", () => {
  const stage = document.querySelector(".stage") as HTMLElement;
  const fx = celebrate(stage, { reducedMotion: false });
  const canvas = stage.querySelector("canvas.win-fx")!;
  expect(canvas.getAttribute("aria-hidden")).toBe("true");
  expect(stage.querySelector(".win-banner")!.getAttribute("aria-hidden")).toBe("true");
  fx.stop();
  fx.stop(); // stopping twice is harmless
  expect(stage.querySelector("canvas.win-fx")).toBeNull();
});

const game = (chat: unknown[]) => ({
  chat, players: [{ id: "me", name: "Me", slot: 0 }, { id: "rival", name: "Rival", slot: 1 }],
});

it("renders chat as text, never as markup", () => {
  const chat = setupChat({ send: vi.fn(), audio: { play: vi.fn() } });
  chat.update(game([{ n: 1, at: 0, slot: 1, kind: "text", text: "<img src=x onerror=alert(1)><b>hi</b>" }]), "me");
  const row = document.querySelector("#chat-log li")!;
  expect(row.querySelector("img")).toBeNull();
  expect(row.querySelector("span")!.textContent).toBe("<img src=x onerror=alert(1)><b>hi</b>");
});

it("announces and sounds only new lines from the rival, not history or your own", () => {
  const audio = { play: vi.fn() }, said = vi.fn();
  const chat = setupChat({ send: vi.fn(), audio });
  const first = { n: 1, at: 0, slot: 1, kind: "text", text: "old" };
  chat.update(game([first]), "me", said); // the page's first snapshot is history
  expect(audio.play).not.toHaveBeenCalled();
  chat.update(game([first, { n: 2, at: 1, slot: 0, kind: "text", text: "mine" }]), "me", said);
  expect(audio.play).not.toHaveBeenCalled();
  chat.update(game([first, { n: 2, at: 1, slot: 0, kind: "text", text: "mine" }, { n: 3, at: 2, slot: 1, kind: "reaction", text: "fire" }]), "me", said);
  expect(audio.play.mock.calls).toEqual([["chat"]]);
  expect(said).toHaveBeenCalledOnce();
  expect(document.querySelectorAll("#reaction-floats .float")).toHaveLength(1);
  expect(document.getElementById("chat-unread")!.textContent).toBe("1");
});

it("hides the chat until there are two players", () => {
  const chat = setupChat({ send: vi.fn(), audio: { play: vi.fn() } });
  chat.update({ chat: [], players: [{ id: "me", name: "Me", slot: 0 }] }, "me");
  expect(document.getElementById("chat")!.hidden).toBe(true);
  chat.update(game([]), "me");
  expect(document.getElementById("chat")!.hidden).toBe(false);
});

it("mutes the rival locally: their lines vanish and make no sound", () => {
  const audio = { play: vi.fn() };
  const chat = setupChat({ send: vi.fn(), audio });
  chat.update(game([]), "me");
  (document.getElementById("chat-mute") as HTMLButtonElement).click();
  chat.update(game([{ n: 1, at: 0, slot: 1, kind: "text", text: "rude" }]), "me");
  expect(audio.play).not.toHaveBeenCalled();
  expect(document.querySelectorAll("#chat-log li")).toHaveLength(0);
});
