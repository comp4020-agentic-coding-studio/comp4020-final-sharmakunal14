import { createAudio } from "./maze-audio.js";

const STORAGE_KEY = "maze-duel-audio-v1";

export function setupAudio() {
  const sound = document.getElementById("sound-enabled");
  const music = document.getElementById("music-enabled");
  const status = document.getElementById("audio-status");
  const note = document.getElementById("audio-note");
  let enabled = false, musicEnabled = true;
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    enabled = saved?.enabled === true;
    musicEnabled = saved?.music !== false;
  } catch { /* Storage is optional; a private or restricted browser stays playable. */ }

  function render() {
    sound.checked = enabled;
    music.checked = musicEnabled;
    music.disabled = !enabled;
    status.textContent = enabled ? "Sound on" : "Sound off";
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
  render();

  sound.addEventListener("change", async () => {
    enabled = sound.checked;
    note.textContent = "Original arcade sounds. Music plays during live races.";
    audio.setEnabled(enabled);
    render();
    await audio.unlock();
    save();
    if (enabled) audio.play("ready");
  });
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
  document.addEventListener("visibilitychange", () => audio.setVisible(!document.hidden));
  window.addEventListener("pagehide", () => audio.dispose(), { once: true });
  window.addEventListener("pageshow", event => { if (event.persisted) location.reload(); });
  return audio;
}
