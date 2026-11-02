// The step indicator above the lobby card: You, Plan, Avatar, Invite, Ready.
// Presentation only. -1 hides it (racing, results, spectating).
const LABELS = ["You", "Plan", "Avatar", "Invite", "Ready"];

export function setStep(index) {
  const list = document.getElementById("steps");
  if (!list) return;
  if (!list.children.length) {
    for (const label of LABELS) {
      const item = document.createElement("li"), dot = document.createElement("span"), text = document.createElement("span");
      dot.className = "step-dot";
      dot.setAttribute("aria-hidden", "true");
      text.className = "step-label";
      text.textContent = label;
      item.append(dot, text);
      list.append(item);
    }
  }
  list.hidden = index < 0;
  [...list.children].forEach((item, i) => {
    item.dataset.state = i < index ? "done" : i === index ? "current" : "todo";
    if (i === index) item.setAttribute("aria-current", "step");
    else item.removeAttribute("aria-current");
  });
}

// Shows one element with a short entrance, but only when it was hidden:
// state changes glide in instead of snapping.
export function reveal(element, on) {
  if (!element || element.hidden === !on) return;
  element.hidden = !on;
  if (!on) return;
  element.classList.remove("reveal");
  void element.offsetWidth;
  element.classList.add("reveal");
}
