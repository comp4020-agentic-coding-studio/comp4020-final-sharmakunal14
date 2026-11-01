import { MAX_CHAT, REACTIONS } from "./maze-chat-rules.js";
import { lookColor, lookOf } from "./maze-look.js";

// The chat dock: quick reactions plus a short text line. Everything the page
// shows is set with textContent; a message is never parsed as HTML.
export function setupChat({ send, audio }) {
  const dock = document.getElementById("chat"), log = document.getElementById("chat-log"), form = document.getElementById("chat-form");
  const input = document.getElementById("chat-input"), bar = document.getElementById("chat-reactions"), toggle = document.getElementById("chat-toggle");
  const badge = document.getElementById("chat-unread"), floats = document.getElementById("reaction-floats");
  input.maxLength = MAX_CHAT;
  let seen = null, unread = 0, open = false, lastSent = 0, players = [], me = null, muted = false;

  for (const [name, emoji] of Object.entries(REACTIONS)) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "reaction";
    button.dataset.reaction = name;
    button.textContent = emoji;
    button.setAttribute("aria-label", `Send ${name} reaction`);
    bar.append(button);
  }

  function setOpen(value) {
    open = value;
    dock.dataset.open = String(open);
    toggle.setAttribute("aria-expanded", String(open));
    if (open) { unread = 0; showUnread(); log.scrollTop = log.scrollHeight; }
  }
  function showUnread() { badge.hidden = unread === 0; badge.textContent = String(unread); }
  toggle.addEventListener("click", () => { setOpen(!open); toggle.blur(); });
  document.getElementById("chat-mute")?.addEventListener("click", (e) => {
    muted = !muted;
    e.currentTarget.setAttribute("aria-pressed", String(muted));
    e.currentTarget.textContent = muted ? "Rival muted" : "Mute rival";
  });

  let busy = false;
  async function post(body) {
    if (busy || performance.now() - lastSent < 400) return;
    busy = true; lastSent = performance.now();
    try { await send(body); } catch (error) { document.getElementById("chat-note").textContent = error.message ?? "Message not sent."; }
    finally { busy = false; }
  }
  bar.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-reaction]");
    if (button) { post({ reaction: button.dataset.reaction }); button.blur(); }
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = input.value.trim();
    if (!value) return;
    input.value = "";
    post({ text: value });
  });

  function line(entry) {
    const who = players.find((p) => p.slot === entry.slot), mine = who?.id === me;
    const row = document.createElement("li"), name = document.createElement("b"), body = document.createElement("span");
    row.className = `chat-line ${mine ? "mine" : "theirs"}`;
    if (who) name.style.color = lookColor(lookOf(who), 68);
    name.textContent = mine ? "You" : who?.name ?? "Rival";
    body.textContent = entry.kind === "reaction" ? REACTIONS[entry.text] ?? "" : entry.text;
    if (entry.kind === "reaction") row.classList.add("is-reaction");
    row.append(name, body);
    return row;
  }

  // A reaction floats up over the stage so it is seen mid-race without opening chat.
  function float(entry, who) {
    const bubble = document.createElement("span");
    bubble.className = `float slot-${entry.slot}`;
    bubble.textContent = REACTIONS[entry.text] ?? "";
    bubble.style.left = `${10 + Math.random() * 70}%`;
    bubble.setAttribute("aria-hidden", "true");
    floats.append(bubble);
    bubble.addEventListener("animationend", () => bubble.remove());
    setTimeout(() => bubble.remove(), 4000);
    if (who) bubble.title = who.name;
  }

  // Called with every snapshot. The first one only establishes what was already said.
  return {
    update(game, myId, announce) {
      players = game.players; me = myId;
      const lines = game.chat ?? [];
      const newest = lines.at(-1)?.n ?? 0;
      dock.hidden = game.players.length < 2;
      const rivalSlot = game.players.find((p) => p.id !== myId)?.slot;
      const visible = lines.filter((l) => !(muted && l.slot === rivalSlot));
      log.replaceChildren(...visible.map(line));
      if (open) log.scrollTop = log.scrollHeight;
      if (seen !== null && newest > seen) {
        for (const entry of lines.filter((l) => l.n > seen)) {
          const theirs = game.players.find((p) => p.slot === entry.slot)?.id !== myId;
          if (muted && theirs) continue;
          if (entry.kind === "reaction") float(entry, game.players.find((p) => p.slot === entry.slot));
          if (theirs) { announce?.(`${game.players.find((p) => p.slot === entry.slot)?.name ?? "Rival"}: ${entry.kind === "reaction" ? entry.text : entry.text}`); audio?.play("chat"); }
          if (theirs && !open) { unread++; showUnread(); }
        }
      }
      seen = newest;
    },
  };
}
