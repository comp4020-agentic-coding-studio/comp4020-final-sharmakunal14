// Chat rules shared by the server (authority) and the browser (drawing).
// Reactions are sent by name, so the server only ever stores a known word.

export const REACTIONS = { clap: "👏", laugh: "😂", wow: "😮", fire: "🔥", cool: "😎", gg: "🤝", hurry: "⏱️", oops: "🙈" };
export const MAX_CHAT = 80;

// Control and direction-override characters are dropped (they can hide or
// reorder text); whitespace is collapsed. Returns null when nothing is left.
/** @param {unknown} value @returns {string | null} */
export function cleanText(value) {
  if (typeof value !== "string") return null;
  const text = value.replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069\ufeff]/g, " ").replace(/\s+/g, " ").trim();
  return Array.from(text).slice(0, MAX_CHAT).join("").trim() || null;
}
