import { readdirSync, readFileSync } from "node:fs";
import { expect, it } from "vitest";

// The race fills the browser window with CSS, never device full screen. Leaving
// full screen at the result resized the whole layout at once, which the player
// found jarring; staying inside the window keeps the size steady throughout.
it("never asks for device full screen in the browser code", () => {
  for (const file of readdirSync("public").filter((f) => f.endsWith(".js"))) {
    expect(readFileSync(`public/${file}`, "utf8"), file).not.toMatch(/requestFullscreen|exitFullscreen/);
  }
});
