import { JSDOM } from "jsdom";
import { afterEach, expect, it } from "vitest";

// A reload once dropped the player back to the default map camera mid-race.
// The chosen camera is now remembered per race for the tab.
afterEach(() => { for (const key of ["window", "document", "sessionStorage"]) delete (globalThis as Record<string, unknown>)[key]; });

it("remembers the camera per race, ignores unknown values, and survives missing storage", async () => {
  const dom = new JSDOM("<!doctype html><body></body>", { url: "http://local/" });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, sessionStorage: dom.window.sessionStorage });
  const { rememberView, savedView } = await import("../public/maze-views.js");
  expect(savedView("race-a")).toBeNull();
  rememberView("race-a", "third");
  expect(savedView("race-a")).toBe("third");
  expect(savedView("race-b")).toBeNull();
  dom.window.sessionStorage.setItem("maze-view:race-c", "drone");
  expect(savedView("race-c")).toBeNull();
  Object.assign(globalThis, { sessionStorage: { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } } });
  expect(() => rememberView("race-a", "first")).not.toThrow();
  expect(savedView("race-a")).toBeNull();
});
