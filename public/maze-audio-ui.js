import { createAudio } from "./maze-audio.js";

const STORAGE_KEY = "maze-duel-audio-v1";

export function setupAudio() {
  const sound = document.getElementById("sound-enabled");
  const music = document.getElementById("music-enabled");
  const status = document.getElementById("audio-status");
  const mute = document.getElementById("mute-button");
  const note = document.getElementById("audio-note");
  // Sound is on unless this visitor has muted it. Browsers still refuse to
  // make noise until the first click or key press, which unlocks it.
  let enabled = true, musicEnabled = true;
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (saved?.enabled === false) enabled = false;
    musicEnabled = saved?.music !== false;
  } catch { /* Storage is optional; a private or restricted browser stays playable. */ }

  function render() {
    sound.checked = enabled;
    music.checked = musicEnabled;
    music.disabled = !enabled;
    status.textContent = enabled ? "Sound on" : "Sound off";
    if (mute) {
      mute.setAttribute("aria-pressed", String(!enabled));
      mute.setAttribute("aria-label", enabled ? "Mute sound" : "Turn sound on");
      mute.dataset.state = enabled ? "on" : "off";
    }
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled, music: musicEnabled })); }
    catch { note.textContent = "Sound settings apply to this page; this browser cannot save them."; }
  }
  const audio = createAudio({ onUnavailable: () => {
    enabled = false;
    render();
    note.textContent = "Audio is unavailable or blocked. You can keep playing, or enable sound to try again.";
  } });
  audio.setEnabled(enabled);
  audio.setMusic(musicEnabled);
  audio.setVisible(!document.hidden);
  // The lobby has its own tune; a race changes it as the game moves on.
  audio.setScene("lobby");
  render();

  async function setSound(value) {
    enabled = value;
    note.textContent = "Original arcade sounds and music, in the style of classic platformers.";
    audio.setEnabled(enabled);
    render();
    await audio.unlock();
    save();
    if (enabled) audio.play("click");
  }
  sound.addEventListener("change", () => setSound(sound.checked));
  mute?.addEventListener("click", () => setSound(!enabled));
  music.addEventListener("change", () => {
    musicEnabled = music.checked;
    audio.setMusic(musicEnabled);
    save();
  });
  // Saved consent never bypasses browser autoplay rules. No sound events queue
  // while locked; the next interaction only unlocks future feedback/music.
  const unlock = () => { if (enabled) void audio.unlock(); };
  document.addEventListener("pointerdown", unlock, { capture: true });
  document.addEventListener("keydown", unlock, { capture: true });
  // After "Create a race" the page reloads and the previous click no longer
  // counts. Chrome still lets same-site pages start sound when the visitor
  // interacted with the site, so try once now; if it refuses, the next click
  // or key press above does it. A refusal is not an error worth showing.
  if (enabled && navigator.userActivation?.hasBeenActive) void audio.unlock({ quiet: true });
  // M mutes from anywhere except a text field, so typing a nickname is safe.
  document.addEventListener("keydown", (event) => {
    if (event.key.toLowerCase() !== "m" || event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
    if (event.target.closest?.("input,textarea,select,[contenteditable=true]")) return;
    void setSound(!enabled);
  });
  document.addEventListener("visibilitychange", () => audio.setVisible(!document.hidden));
  window.addEventListener("pagehide", () => audio.dispose(), { once: true });
  window.addEventListener("pageshow", event => { if (event.persisted) location.reload(); });
  return audio;
}
