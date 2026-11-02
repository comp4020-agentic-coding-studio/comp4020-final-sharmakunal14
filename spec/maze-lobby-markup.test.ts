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

it("keeps today's lists under the maze, not in the side column", () => {
  const d = doc();
  expect(d.getElementById("best")!.closest(".under-stage")).not.toBeNull();
  expect(d.getElementById("recent")!.closest(".under-stage")).not.toBeNull();
  expect(d.getElementById("best")!.closest(".panel-col")).toBeNull();
});
