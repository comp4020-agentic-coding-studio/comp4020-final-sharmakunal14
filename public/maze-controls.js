const keys = { arrowup: "up", w: "up", arrowright: "right", d: "right", arrowdown: "down", s: "down", arrowleft: "left", a: "left" };

export function setupControls(canMove, move) {
  let held = null, timer = null, pending = false, nextAt = 0;

  function stop() {
    held = null;
    clearInterval(timer);
    timer = null;
  }

  async function attempt(direction) {
    if (!canMove() || pending || performance.now() < nextAt) return;
    pending = true;
    // No queue: an input from before a disconnect must not run on reconnect.
    try { await move(direction); }
    finally { nextAt = performance.now() + 150; pending = false; }
  }

  function start(direction, source) {
    if (!canMove()) return;
    held = { direction, source };
    void attempt(direction);
    if (timer === null) timer = setInterval(() => {
      if (!canMove()) return stop();
      if (held) void attempt(held.direction);
    }, 30);
  }

  document.addEventListener("keydown", (event) => {
    const direction = keys[event.key.toLowerCase()];
    if (!direction || event.ctrlKey || event.altKey || event.metaKey || event.target.closest?.("input,textarea,select,[contenteditable=true]")) return;
    if (!canMove()) return;
    event.preventDefault();
    if (!event.repeat) start(direction, event.code);
  });
  document.addEventListener("keyup", (event) => { if (held?.source === event.code) stop(); });
  window.addEventListener("blur", stop);
  document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); });

  for (const button of document.querySelectorAll("[data-direction]")) {
    button.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || !canMove()) return;
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      start(button.dataset.direction, event.pointerId);
    });
    for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) {
      button.addEventListener(name, (event) => { if (held?.source === event.pointerId) stop(); });
    }
    // Enter, Space and assistive activation generate a click without a pointer.
    button.addEventListener("click", (event) => { if (event.detail === 0) void attempt(button.dataset.direction); });
  }
  return stop;
}
