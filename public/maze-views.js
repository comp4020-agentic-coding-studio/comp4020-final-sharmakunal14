const VIEWS = ["overview", "third", "first"];

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
    const label = { overview: "Map view", third: "Third-person view", first: "First-person view" }[name];
    const announcement = document.getElementById("announcement");
    if (announcement) announcement.textContent = label;
  };
  for (const b of buttons) b.addEventListener("click", () => { select(b.dataset.view); b.blur(); });
  document.addEventListener("keydown", (event) => {
    if (event.key.toLowerCase() !== "v" || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.target.closest?.("input,textarea,select,[contenteditable=true]")) return;
    event.preventDefault();
    select(VIEWS[(VIEWS.indexOf(view.view) + 1) % VIEWS.length]);
  });
  select("overview", false);
}
