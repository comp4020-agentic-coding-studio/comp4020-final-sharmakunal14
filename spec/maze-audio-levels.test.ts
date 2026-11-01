import { expect, it } from "vitest";
import { CUES, EFFECTS, LEVELS } from "../public/maze-audio.js";

// The first audio shipped with every effect peaking near 0.04: scheduled,
// "tested" and inaudible. These bounds come from measuring real Chrome output
// (peak 0.29 to 0.52 per effect, music 0.39) and fail if the gain staging drops.
const loudest = (cue: (typeof CUES)[number]) =>
  Math.max(...EFFECTS[cue].map(([, , , o]) => LEVELS.effect * (o?.level ?? 1))) * LEVELS.master;

it("keeps every effect loud enough to hear on laptop speakers", () => {
  for (const cue of CUES) expect(loudest(cue), cue).toBeGreaterThanOrEqual(0.25);
});

it("never lets one voice exceed full scale", () => {
  for (const cue of CUES) expect(LEVELS.effect * LEVELS.master, cue).toBeLessThan(1);
});

it("keeps music audible but clearly under the effects", () => {
  const music = (LEVELS.lead + LEVELS.bass) * LEVELS.music * LEVELS.master;
  expect(music).toBeGreaterThanOrEqual(0.1);
  expect(music).toBeLessThan(loudest("step"));
});

it("has a sound for every action the game reports", () => {
  for (const cue of ["step", "turn", "bump", "flip", "ready", "tick", "go", "win", "lose", "end", "camera", "click", "join", "portal"])
    expect(CUES).toContain(cue);
});
