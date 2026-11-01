import { ACCESSORIES, FACES, FINISHES, SHAPES, defaultLook, parseLook } from "./maze-look.js";

const KEY = "maze-duel-look-v1";
const GROUPS = [["shape", "Shape", SHAPES], ["accessory", "Accessory", ACCESSORIES], ["face", "Face", FACES], ["finish", "Finish", FINISHES]];
const label = (value) => value[0].toUpperCase() + value.slice(1);
const pick = (list) => list[Math.floor(Math.random() * list.length)];

// The avatar designer. `look()` is what is shown; `chosen()` is the look only
// once the visitor has changed something, so a joiner who never touched it
// keeps the server's default for their seat. Changes are announced on the
// document so the race page can send them while the room is still waiting.
export function setupAvatarPicker(preview = null) {
  const root = document.getElementById("avatar-options");
  if (!root) return { look: () => defaultLook(0), chosen: () => undefined };
  let look = defaultLook(0), chosen = false;
  try {
    const saved = parseLook(JSON.parse(localStorage.getItem(KEY) ?? "null"), 0);
    if (saved) { look = saved; chosen = true; }
  } catch { /* blocked or malformed storage: start from the default */ }

  const form = document.createDocumentFragment();
  for (const [key, title, values] of GROUPS) {
    const set = document.createElement("fieldset"), legend = document.createElement("legend");
    set.className = "opt-group";
    legend.textContent = title;
    set.append(legend);
    for (const value of values) {
      const wrap = document.createElement("label"), input = document.createElement("input"), text = document.createElement("span");
      wrap.className = "chip-opt";
      input.type = "radio"; input.name = `look-${key}`; input.value = value;
      text.textContent = label(value);
      input.addEventListener("change", () => change({ [key]: value }));
      wrap.append(input, text);
      set.append(wrap);
    }
    form.append(set);
  }
  const hue = document.createElement("label");
  hue.className = "hue-row";
  hue.append("Colour");
  const slider = document.createElement("input");
  slider.type = "range"; slider.min = "0"; slider.max = "359"; slider.step = "1"; slider.id = "avatar-hue";
  slider.addEventListener("input", () => change({ hue: Number(slider.value) }));
  hue.append(slider);
  form.append(hue);
  root.replaceChildren(form);

  function paint() {
    for (const [key] of GROUPS) {
      for (const input of root.querySelectorAll(`input[name="look-${key}"]`)) input.checked = input.value === look[key];
    }
    slider.value = String(look.hue);
    document.getElementById("avatar-card")?.style.setProperty("--avatar-hue", String(look.hue));
    preview?.set(look);
  }
  function change(patch) {
    look = { ...look, ...patch };
    chosen = true;
    try { localStorage.setItem(KEY, JSON.stringify(look)); } catch { /* the look still applies this visit */ }
    paint();
    document.dispatchEvent(new window.CustomEvent("maze:look", { detail: look }));
  }
  // The race page tells the picker what the server saved for this player.
  document.addEventListener("maze:sync-look", (event) => { look = event.detail; paint(); });
  document.getElementById("avatar-random")?.addEventListener("click", () => {
    change({ shape: pick(SHAPES), accessory: pick(ACCESSORIES), face: pick(FACES), finish: pick(FINISHES), hue: Math.floor(Math.random() * 360) });
  });
  paint();
  return { look: () => look, chosen: () => (chosen ? look : undefined), onChange: (fn) => document.addEventListener("maze:look", (e) => fn(e.detail)) };
}
