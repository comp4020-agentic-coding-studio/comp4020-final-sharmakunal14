const VIEWS = ["overview", "third", "first"];

// The chosen camera is remembered per race in localStorage, so a reload or a
// closed and reopened window puts the player back in the view they were using
// (sessionStorage was lost when the window closed). Storage can be
// unavailable; then the view simply is not remembered.
const viewKey = (race) => `maze-view:${race}`;
export function savedView(race) {
  try {
    const name = localStorage.getItem(viewKey(race));
    return VIEWS.includes(name) ? name : null;
  } catch { return null; }
}
export function rememberView(race, name) {
  try { localStorage.setItem(viewKey(race), name); } catch { /* not remembered */ }
}

// Pages that need to know when the camera changes (the race remembers it).
const listeners = new Set();
export function onViewChange(listener) { listeners.add(listener); }

// Camera switcher: buttons on the stage plus the V key.
export function setupViews(view, onChange = () => {}) {
  if (!view.setView) {
    document.querySelector(".hud-views")?.setAttribute("hidden", "");
    return;
  }
  const buttons = [...document.querySelectorAll("[data-view]")];
  const select = (name, announce = true) => {
    if (announce && name !== view.view) onChange();
    view.setView(name);
    document.body.dataset.view = name;
    for (const b of buttons) b.setAttribute("aria-pressed", String(b.dataset.view === name));
    listeners.forEach((listener) => listener(name));
    const label = { overview: "Map view", third: "Third-person view", first: "First-person view" }[name];
    const announcement = document.getElementById("announcement");
    if (announcement) announcement.textContent = label;
  };
  for (const b of buttons) b.addEventListener("click", () => { select(b.dataset.view); b.blur(); });
  document.addEventListener("keydown", (event) => {
    if (event.key.toLowerCase() !== "v" || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.target.closest?.("input,textarea,select,[contenteditable=true]")) return;
    // A replay has no player of your own to follow, so the map is the only view.
    if (document.body.dataset.phase === "replay") return;
    event.preventDefault();
    select(VIEWS[(VIEWS.indexOf(view.view) + 1) % VIEWS.length]);
  });
  select("overview", false);
}
