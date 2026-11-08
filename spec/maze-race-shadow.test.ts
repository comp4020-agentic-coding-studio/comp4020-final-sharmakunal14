import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

// The race page's time formatter `clock` was once shadowed by a timer of the
// same name inside mountRace. Calling it then threw inside a try/catch, so the
// "Personal best" note silently vanished after any win that was not a new best.
it("never redeclares the race page's time formatter inside the module", () => {
  const source = readFileSync("public/maze-race.js", "utf8");
  const declarations = [...source.matchAll(/\b(?:const|let|var|function)\s+clock\b/g)];
  expect(declarations, "`clock` must be declared once, as the formatter").toHaveLength(1);
  expect(source).toMatch(/^const clock = \(ms\) =>/m);
});
