import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { expect, it } from "vitest";

const doc = () => new JSDOM(readFileSync("public/maze.html", "utf8")).window.document;

it("puts the avatar designer in a dialog, so it can open in front", () => {
  const d = doc();
  const dialog = d.getElementById("avatar-card")!;
  expect(dialog.tagName).toBe("DIALOG");
  expect(dialog.getAttribute("aria-labelledby")).toBe("avatar-title");
  for (const id of ["avatar-preview", "avatar-options", "avatar-random", "avatar-go"]) expect(dialog.querySelector(`#${id}`), id).not.toBeNull();
  expect(d.getElementById("avatar-open")).not.toBeNull(); // a way back to it
});

it("has a spectator panel with follow buttons and no movement controls inside it", () => {
  const panel = doc().getElementById("spectator-panel")!;
  expect(panel.querySelectorAll("[data-follow]")).toHaveLength(2);
  expect(panel.querySelector("[data-direction]")).toBeNull();
  expect(panel.hidden).toBe(true);
});

it("offers the spectator link in the race panel, read-only", () => {
  const d = doc();
  const box = d.getElementById("spectate-box")!, link = d.getElementById("spectate-link") as HTMLInputElement;
  expect(box.closest("#race-panel")).not.toBeNull();
  expect(link.readOnly).toBe(true);
  expect(d.getElementById("copy-spectate")!.getAttribute("aria-label")).toMatch(/spectator/i);
});

it("has a rematch card that is announced politely and can be dismissed", () => {
  const d = doc(), toast = d.getElementById("rematch-toast")!;
  expect(toast.getAttribute("role")).toBe("status");
  expect(toast.hidden).toBe(true);
  expect(d.getElementById("toast-join")).not.toBeNull();
  expect(d.getElementById("toast-close")!.getAttribute("aria-label")).toBe("Dismiss");
});

it("moves today's lists into a leaderboard dialog, off the first screen", () => {
  const d = doc(), board = d.getElementById("board-dialog")!;
  expect(board.tagName).toBe("DIALOG");
  expect(board.querySelector("#best")).not.toBeNull();
  expect(board.querySelector("#recent")).not.toBeNull();
  expect(d.getElementById("how-to-play")).toBeNull();
  expect(d.querySelector('[data-open="board-dialog"]')).not.toBeNull();
});

it("shows one step at a time: only the name pane starts in view, the rest wait beside it", () => {
  const d = doc(), panes = [...d.querySelectorAll(".pane")] as HTMLElement[];
  expect(panes.map((p) => p.dataset.pane)).toEqual(["name", "choose", "join"]);
  expect(panes.map((p) => p.dataset.pos)).toEqual(["current", "after", "after"]);
  expect(d.querySelectorAll("#entry .btn-primary").length).toBeGreaterThan(0);
  expect(d.getElementById("avatar-back")).not.toBeNull(); // every step has a way back
  expect(d.getElementById("join-back")).not.toBeNull();
});
