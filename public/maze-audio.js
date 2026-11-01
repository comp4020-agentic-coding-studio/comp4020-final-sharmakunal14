// @ts-check
/** @typedef {'step'|'turn'|'bump'|'flip'|'ready'|'tick'|'go'|'win'|'lose'|'end'|'camera'} Cue */
/** Original note sequences: MIDI pitch, offset in seconds, duration in seconds.
 * @type {Record<Cue, [number, number, number][]>} */
const EFFECTS = {
  step: [[72, 0, .035], [79, .035, .035]],
  turn: [[62, 0, .045]],
  bump: [[38, 0, .075], [34, .06, .065]],
  flip: [[64, 0, .07], [76, .07, .07], [83, .14, .13]],
  ready: [[67, 0, .09], [74, .1, .13]],
  tick: [[76, 0, .09]],
  go: [[72, 0, .09], [79, .1, .09], [84, .2, .22]],
  win: [[72, 0, .12], [76, .14, .12], [81, .28, .12], [79, .42, .12], [86, .56, .2], [84, .8, .4]],
  lose: [[76, 0, .14], [72, .17, .14], [69, .34, .25], [60, .64, .3]],
  end: [[67, 0, .16], [62, .2, .25]],
  camera: [[79, 0, .04], [74, .05, .06]],
};
// Original two-bar motif and four-bar bass cycle, at 120 BPM. Zero is a rest.
const MELODY = [76, 0, 79, 81, 0, 79, 74, 0, 72, 76, 0, 74, 79, 0, 83, 79,
  81, 0, 84, 83, 79, 0, 76, 0, 74, 77, 0, 76, 72, 0, 74, 0];
const BASS = [48, 53, 57, 55];
const MAX_VOICES = 24;

/** One lazily created context; all scheduling is bounded and purely decorative.
 * @param {{createContext?: () => AudioContext, onUnavailable?: () => void}} options */
export function createAudio({ createContext = () => new AudioContext(), onUnavailable = () => {} } = {}) {
  /** @type {AudioContext | undefined} */
  let context;
  /** @type {GainNode | undefined} */
  let master;
  let enabled = false, music = true, racing = false, visible = true, disposed = false;
  /** @type {ReturnType<typeof setInterval> | undefined} */
  let timer;
  let beat = 0, nextBeat = 0;
  /** @type {Map<Cue, number>} */
  const lastCue = new Map();
  /** @type {Set<{osc: OscillatorNode, gain: GainNode, music: boolean}>} */
  const voices = new Set();
  const active = () => enabled && visible && !disposed && context?.state === "running";

  /** @param {boolean} onlyMusic */
  function stopVoices(onlyMusic) {
    for (const voice of voices) {
      if (onlyMusic && !voice.music) continue;
      voice.osc.stop();
      voice.osc.disconnect();
      voice.gain.disconnect();
      voices.delete(voice);
    }
  }
  function stopMusic() {
    clearInterval(timer);
    timer = undefined;
    stopVoices(true);
  }
  /** @param {number} note @param {number} at @param {number} duration
   * @param {number} level @param {OscillatorType} type @param {boolean} isMusic */
  function tone(note, at, duration, level, type, isMusic) {
    if (!context || !master || voices.size >= MAX_VOICES) return;
    const osc = context.createOscillator(), gain = context.createGain();
    const voice = { osc, gain, music: isMusic };
    osc.type = type;
    osc.frequency.setValueAtTime(440 * 2 ** ((note - 69) / 12), at);
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(level, at + .006);
    gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
    osc.connect(gain);
    gain.connect(master);
    voices.add(voice);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); voices.delete(voice); };
    osc.start(at);
    osc.stop(at + duration + .01);
  }
  function schedule() {
    if (!context || !active()) return;
    // A stalled tab skips missed beats instead of scheduling a catch-up burst.
    if (nextBeat < context.currentTime) nextBeat = context.currentTime + .02;
    if (nextBeat > context.currentTime + .15) return;
    const note = MELODY[beat % MELODY.length];
    if (note) tone(note, nextBeat, .12, .10, "square", true);
    if (beat % 2 === 0) tone(BASS[Math.floor(beat / 8) % BASS.length], nextBeat, .19, .16, "triangle", true);
    beat++;
    nextBeat += .25;
  }
  function syncMusic() {
    if (!active() || !music || !racing) { stopMusic(); return; }
    if (timer !== undefined || !context) return;
    beat = 0;
    nextBeat = context.currentTime + .02;
    schedule();
    timer = setInterval(schedule, 100);
  }
  function unavailable() {
    enabled = false;
    stopMusic();
    stopVoices(false);
    onUnavailable();
  }

  return {
    /** Must be called from a user gesture; never queues old cues while locked. */
    async unlock() {
      if (!enabled || disposed || !visible) return;
      try {
        if (!context) {
          context = createContext();
          master = context.createGain();
          master.gain.value = .3;
          master.connect(context.destination);
          context.onstatechange = () => {
            if (context?.state !== "running") stopVoices(false);
            syncMusic();
          };
        }
        if (context.state !== "running") await context.resume();
        syncMusic(); // Re-check mute/visibility/disposal after asynchronous resume.
      } catch { unavailable(); }
    },
    /** @param {boolean} value */
    setEnabled(value) {
      enabled = value;
      if (!value) { stopMusic(); stopVoices(false); lastCue.clear(); }
      else syncMusic();
    },
    /** @param {boolean} value */
    setMusic(value) { music = value; syncMusic(); },
    /** @param {boolean} value */
    setRacing(value) { racing = value; syncMusic(); },
    /** @param {boolean} value */
    setVisible(value) {
      visible = value;
      if (!value) { stopMusic(); stopVoices(false); }
      else syncMusic();
    },
    /** @param {Cue} cue */
    play(cue) {
      if (!active() || !context) return;
      const now = context.currentTime;
      if (now - (lastCue.get(cue) ?? -Infinity) < (cue === "bump" ? .25 : .09)) return;
      lastCue.set(cue, now);
      // Make room for a result and stop accompaniment before its final phrase.
      if (cue === "win" || cue === "lose" || cue === "end") { racing = false; stopMusic(); stopVoices(false); }
      for (const [note, delay, length] of EFFECTS[cue]) {
        tone(note, now + .005 + delay, length, cue === "step" || cue === "turn" ? .13 : .26, cue === "bump" ? "triangle" : "square", false);
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      stopMusic();
      stopVoices(false);
      if (context) { context.onstatechange = null; void context.close().catch(onUnavailable); }
    },
  };
}
