const keys = { arrowup: "up", w: "up", arrowright: "right", d: "right", arrowdown: "down", s: "down", arrowleft: "left", a: "left", e: "flip", " ": "flip" };

// Turns held keys and touch into a steady stream of actions. `act` applies one
// locally and returns false when the local prediction already refuses it.
// The caller batches and sends; this module never sends after a disconnect.
export function setupControls(canMove, act, interval = 150) {
  let held = null, timer = null, nextAt = 0;

  function stop() {
    held = null;
    clearInterval(timer);
    timer = null;
  }

  function attempt(action) {
    if (!canMove() || performance.now() < nextAt) return;
    if (act(action) !== false) nextAt = performance.now() + interval;
  }

  function start(action, source) {
    if (!canMove()) return;
    if (action === "flip") return attempt(action);
    held = { action, source };
    attempt(action);
    if (timer === null) timer = setInterval(() => {
      if (!canMove()) return stop();
      if (held) attempt(held.action);
    }, 30);
  }

  document.addEventListener("keydown", (event) => {
    const action = keys[event.key.toLowerCase()];
    if (!action || event.ctrlKey || event.altKey || event.metaKey || event.target.closest?.("input,textarea,select,button,[contenteditable=true]")) return;
    if (!canMove()) return;
    event.preventDefault();
    if (!event.repeat) start(action, event.code);
  });
  document.addEventListener("keyup", (event) => { if (held?.source === event.code) stop(); });
  window.addEventListener("blur", stop);
  document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); });

  for (const button of document.querySelectorAll("[data-direction]")) {
    button.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || !canMove()) return;
      event.preventDefault();
      if (button.dataset.direction !== "flip") button.setPointerCapture(event.pointerId);
      start(button.dataset.direction, event.pointerId);
    });
    for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) {
      button.addEventListener(name, (event) => { if (held?.source === event.pointerId) stop(); });
    }
    // Enter, Space and assistive activation generate a click without a pointer.
    button.addEventListener("click", (event) => { if (event.detail === 0) attempt(button.dataset.direction); });
  }
  return stop;
}

// Sends unconfirmed actions with one request in flight. Actions queued while
// a request travels go together in the next batch, so a long round trip costs
// latency, not speed. `send(actions, firstSequence)` resolves to the server's
// confirmed sequence, or null when the request failed.
export function createSender(send, maxBatch = 8) {
  let pending = [], confirmed = 0, issued = 0, inFlight = false;
  const settle = (sequence) => {
    confirmed = Math.max(confirmed, sequence);
    issued = Math.max(issued, confirmed);
    pending = pending.filter((p) => p.sequence > confirmed);
  };
  async function flush() {
    if (inFlight || pending.length === 0) return;
    const batch = pending.slice(0, maxBatch);
    inFlight = true;
    let result = null;
    try { result = await send(batch.map((p) => p.action), batch[0].sequence); }
    finally { inFlight = false; }
    if (result === null) { pending = []; issued = confirmed; return; }
    settle(result);
    // The server stopped part-way: later predictions built on a refused action.
    if (confirmed < batch.at(-1).sequence) { pending = []; issued = confirmed; }
    void flush();
  }
  return {
    push(action) {
      pending.push({ action, sequence: ++issued });
      void flush();
    },
    // A snapshot's saved sequence confirms everything up to it.
    settle,
    // Drop queued input (blur, disconnect); a request already sent still settles.
    clear() { pending = []; if (!inFlight) issued = confirmed; },
    get unconfirmed() { return pending.map((p) => p.action); },
    get busy() { return inFlight; },
  };
}
