// Avatar looks. Shared by the server (validation) and the browser (drawing).
// Presentation only: a look never affects positions, speed or who wins.

/** @typedef {{ shape: string, hue: number, accessory: string, face: string, finish: string }} Look */

export const SHAPES = ["capsule", "robot", "blob", "cone"];
export const ACCESSORIES = ["none", "crown", "antenna", "horns", "cap", "halo"];
export const FACES = ["visor", "eyes", "cyclops"];
export const FINISHES = ["matte", "glossy", "neon"];
// A and B keep their classic green and orange until the player chooses.
const SLOT_HUES = [152, 20];

/** @param {number} slot @returns {Look} */
export function defaultLook(slot) {
  return { shape: "capsule", hue: SLOT_HUES[slot] ?? SLOT_HUES[0], accessory: "none", face: "visor", finish: "glossy" };
}

// Only whitelisted names and an integer hue are accepted, so a look can never
// carry markup or an arbitrary CSS value. Missing fields take the default.
/** @param {unknown} value @returns {Look | null} */
export function parseLook(value, slot = 0) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = /** @type {Record<string, unknown>} */ (value), out = defaultLook(slot);
  for (const [key, list] of /** @type {[keyof Look, string[]][]} */ ([["shape", SHAPES], ["accessory", ACCESSORIES], ["face", FACES], ["finish", FINISHES]])) {
    if (input[key] === undefined) continue;
    if (typeof input[key] !== "string" || !list.includes(input[key])) return null;
    out[key] = /** @type {never} */ (input[key]);
  }
  if (input.hue !== undefined) {
    if (typeof input.hue !== "number" || !Number.isInteger(input.hue) || input.hue < 0 || input.hue > 359) return null;
    out.hue = input.hue;
  }
  return out;
}

// Games saved before looks existed have none: fall back to the slot default.
/** @param {{ slot: number, look?: unknown }} player */
export const lookOf = (player) => parseLook(player.look, player.slot) ?? defaultLook(player.slot);
/** @param {Look} look */
export const lookColor = (look, light = 55) => `hsl(${look.hue} 85% ${light}%)`;
