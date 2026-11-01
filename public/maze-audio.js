// @ts-check
/** @typedef {'step'|'turn'|'bump'|'flip'|'ready'|'tick'|'go'|'win'|'lose'|'end'|'camera'|'click'|'join'|'portal'|'chat'} Cue */
/** @typedef {'lobby'|'waiting'|'countdown'|'race'|'off'} Scene */
/**
 * Original arcade sounds in the style of classic platformers. Each effect is a
 * list of [midi note, offset s, duration s, optional {type, slideTo, level}].
 * Nothing here is taken from a real game: the phrases are our own.
 * @type {Record<Cue, [number, number, number, {type?: OscillatorType, slideTo?: number, level?: number}?][]>}
 */
const EFFECTS = {
  // A quick rising "hop" for each step.
  step: [[67, 0, .07, { slideTo: 79, level: .55 }]],
  turn: [[62, 0, .05, { type: "triangle", level: .7 }], [66, .04, .05, { type: "triangle", level: .6 }]],
  bump: [[45, 0, .09, { type: "square", slideTo: 33, level: .8 }], [33, .07, .1, { type: "triangle", level: .9 }]],
  // Two bright coin-style blips, the second held.
  flip: [[83, 0, .07, { level: 1 }], [88, .07, .38, { level: 1 }]],
  ready: [[72, 0, .08], [76, .08, .08], [79, .16, .08], [84, .24, .22]],
  tick: [[79, 0, .11, { level: .9 }]],
  // Race start: a quick fanfare ending on a long high note.
  go: [[72, 0, .1], [72, .12, .1], [79, .24, .1], [84, .36, .5, { level: 1 }]],
  // Victory jingle: climbing run, then a held chord.
  win: [
    [72, 0, .12], [76, .12, .12], [79, .24, .12], [84, .36, .12], [79, .5, .12], [84, .62, .12], [88, .74, .5, { level: .85 }],
    [60, .74, .55, { type: "triangle", level: .5 }], [64, .74, .55, { type: "triangle", level: .35 }],
  ],
  lose: [[76, 0, .16], [72, .18, .16], [69, .36, .16], [64, .54, .16], [57, .72, .5, { type: "triangle", slideTo: 45, level: 1 }]],
  end: [[67, 0, .18], [62, .22, .3, { type: "triangle" }]],
  camera: [[79, 0, .05, { level: .7 }], [86, .05, .07, { level: .7 }]],
  click: [[84, 0, .04, { level: .6 }]],
  join: [[74, 0, .08], [81, .09, .16]],
  portal: [[60, 0, .1, { slideTo: 96, level: .8 }]],
  // A soft two-note pop for a message from your rival.
  chat: [[88, 0, .05, { level: .7 }], [93, .05, .08, { level: .7 }]],
};

/** @typedef {{ lead: number[], bass: number[], drums?: string, bpm: number, step: number, leadType?: OscillatorType, hold?: number }} Tune */

// Original tunes. 0 = rest. `step` is the number of notes per beat subdivision.
// Lobby: a bouncy major tune with an off-beat bass, like an overworld.
/** @type {Tune} */
const LOBBY = {
  bpm: 132, step: 2, hold: .55,
  lead: [
    76, 0, 76, 0, 0, 76, 0, 72, 76, 0, 79, 0, 0, 0, 67, 0,
    72, 0, 0, 67, 0, 0, 64, 0, 0, 69, 0, 71, 0, 70, 69, 0,
    67, 76, 79, 81, 0, 77, 79, 0, 76, 0, 72, 74, 71, 0, 0, 0,
    72, 0, 0, 67, 0, 0, 64, 0, 0, 69, 0, 71, 0, 70, 69, 0,
  ],
  bass: [48, 0, 55, 0, 48, 0, 55, 0, 53, 0, 60, 0, 53, 0, 60, 0, 52, 0, 59, 0, 52, 0, 59, 0, 55, 0, 62, 0, 55, 0, 62, 0],
  drums: "k.h.s.h.k.h.s.hk",
};
// Waiting room: calmer, playful, slower.
/** @type {Tune} */
const WAITING = {
  bpm: 104, step: 2, hold: .7, leadType: "triangle",
  lead: [
    72, 0, 76, 0, 79, 0, 76, 0, 74, 0, 77, 0, 81, 0, 77, 0,
    72, 0, 76, 0, 79, 0, 84, 0, 83, 0, 79, 0, 76, 0, 0, 0,
  ],
  bass: [48, 0, 0, 0, 55, 0, 0, 0, 53, 0, 0, 0, 55, 0, 0, 0],
  drums: "k...h...s...h...",
};
// Race: fast and driving, minor-ish and urgent.
/** @type {Tune} */
const RACE = {
  bpm: 168, step: 2, hold: .5,
  lead: [
    69, 0, 72, 0, 76, 0, 72, 0, 69, 0, 72, 0, 76, 79, 76, 0,
    77, 0, 81, 0, 84, 0, 81, 0, 77, 0, 81, 0, 79, 76, 72, 0,
    67, 0, 71, 0, 74, 0, 71, 0, 67, 0, 71, 0, 74, 77, 74, 0,
    76, 0, 72, 0, 69, 0, 72, 0, 76, 0, 79, 0, 81, 0, 0, 0,
  ],
  bass: [45, 45, 52, 45, 45, 45, 52, 45, 53, 53, 60, 53, 53, 53, 60, 53, 43, 43, 50, 43, 43, 43, 50, 43, 45, 45, 52, 45, 52, 45, 52, 57],
  drums: "k.h.s.hhk.h.s.sh",
};
// Countdown: a tense pulse that builds into the fanfare.
/** @type {Tune} */
const COUNTDOWN = {
  bpm: 144, step: 2, hold: .4,
  lead: [67, 0, 67, 0, 67, 0, 67, 0, 72, 0, 72, 0, 72, 0, 72, 0],
  bass: [43, 43, 43, 43, 48, 48, 48, 48],
  drums: "k.k.k.k.s.s.ssss",
};
/** @type {Record<Exclude<Scene, 'off'>, Tune>} */
const TUNES = { lobby: LOBBY, waiting: WAITING, race: RACE, countdown: COUNTDOWN };

const MAX_VOICES = 40;
const MASTER = .9;
const LOOKAHEAD = .2;
const EFFECT_GAIN = .55;
/** Exposed so a test can check loudness without a sound card. */
export const LEVELS = { master: MASTER, effect: EFFECT_GAIN, music: .42, lead: .17, bass: .3 };
export const CUES = /** @type {Cue[]} */ (Object.keys(EFFECTS));
export { EFFECTS };

/** One lazily created context; all scheduling is bounded and purely decorative.
 * @param {{createContext?: () => AudioContext, onUnavailable?: () => void}} options */
export function createAudio({ createContext = () => new AudioContext(), onUnavailable = () => {} } = {}) {
  /** @type {AudioContext | undefined} */
  let context;
  /** @type {GainNode | undefined} */
  let master;
  /** @type {GainNode | undefined} */
  let musicBus;
  /** @type {AudioBuffer | undefined} */
  let noise;
  let enabled = false, music = true, scene = /** @type {Scene} */ ("off"), visible = true, disposed = false;
  /** @type {ReturnType<typeof setInterval> | undefined} */
  let timer;
  let beat = 0, nextBeat = 0;
  /** @type {Scene} */
  let playing = "off";
  /** @type {Map<Cue, number>} */
  const lastCue = new Map();
  /** @type {Set<{osc: AudioScheduledSourceNode, gain: GainNode, music: boolean}>} */
  const voices = new Set();
  const active = () => enabled && visible && !disposed && context?.state === "running";

  /** @param {boolean} onlyMusic */
  function stopVoices(onlyMusic) {
    for (const voice of voices) {
      if (onlyMusic && !voice.music) continue;
      try { voice.osc.stop(); } catch { /* already stopped */ }
      voice.osc.disconnect();
      voice.gain.disconnect();
      voices.delete(voice);
    }
  }
  function stopMusic() {
    clearInterval(timer);
    timer = undefined;
    playing = "off";
    stopVoices(true);
  }
  const hz = (/** @type {number} */ note) => 440 * 2 ** ((note - 69) / 12);

  /** @param {number} note @param {number} at @param {number} duration @param {number} level
   * @param {OscillatorType} type @param {boolean} isMusic @param {number} [slideTo] @param {number} [vibrato] */
  function tone(note, at, duration, level, type, isMusic, slideTo, vibrato = 0) {
    if (!context || !master || voices.size >= MAX_VOICES) return;
    const osc = context.createOscillator(), gain = context.createGain();
    const voice = { osc, gain, music: isMusic };
    osc.type = type;
    osc.frequency.setValueAtTime(hz(note), at);
    if (slideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(hz(slideTo), at + duration * .9);
    if (vibrato && osc.detune) {
      // A slight wobble on held lead notes gives the 8-bit "voice".
      for (let t = .12; t < duration; t += .06) osc.detune.setValueAtTime(Math.sin(t * 40) * vibrato, at + t);
    }
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(level, at + .006);
    gain.gain.setValueAtTime(level * .8, at + Math.min(.03, duration * .3));
    gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
    osc.connect(gain);
    gain.connect(isMusic ? (musicBus ?? master) : master);
    voices.add(voice);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); voices.delete(voice); };
    osc.start(at);
    osc.stop(at + duration + .01);
  }
  /** Short noise burst for drums. @param {number} at @param {number} duration @param {number} level @param {number} freq */
  function drum(at, duration, level, freq) {
    if (!context || !master || voices.size >= MAX_VOICES) return;
    if (!noise) {
      noise = context.createBuffer(1, context.sampleRate * .5, context.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    const src = context.createBufferSource(), gain = context.createGain(), filter = context.createBiquadFilter();
    const voice = { osc: src, gain, music: true };
    src.buffer = noise;
    filter.type = freq > 4000 ? "highpass" : "bandpass";
    filter.frequency.value = freq;
    gain.gain.setValueAtTime(level, at);
    gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(musicBus ?? master);
    voices.add(voice);
    src.onended = () => { src.disconnect(); filter.disconnect(); gain.disconnect(); voices.delete(voice); };
    src.start(at);
    src.stop(at + duration + .01);
  }
  /** A kick is a fast downward sine sweep. @param {number} at */
  function kick(at) {
    if (!context || !master || voices.size >= MAX_VOICES) return;
    const osc = context.createOscillator(), gain = context.createGain();
    const voice = { osc, gain, music: true };
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, at);
    osc.frequency.exponentialRampToValueAtTime(40, at + .12);
    gain.gain.setValueAtTime(.9, at);
    gain.gain.exponentialRampToValueAtTime(.0001, at + .16);
    osc.connect(gain);
    gain.connect(musicBus ?? master);
    voices.add(voice);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); voices.delete(voice); };
    osc.start(at);
    osc.stop(at + .18);
  }

  function schedule() {
    if (!context || !active() || playing === "off") return;
    const tune = TUNES[/** @type {Exclude<Scene,'off'>} */ (playing)];
    const length = (60 / tune.bpm) / tune.step;
    // A stalled tab skips missed beats instead of scheduling a catch-up burst.
    if (nextBeat < context.currentTime) nextBeat = context.currentTime + .02;
    while (nextBeat <= context.currentTime + LOOKAHEAD) {
      const note = tune.lead[beat % tune.lead.length];
      if (note) tone(note, nextBeat, length * (tune.hold ?? .6) * 1.6, .17, tune.leadType ?? "square", true, undefined, 18);
      const bass = tune.bass[Math.floor(beat / 2) % tune.bass.length];
      if (bass && beat % 2 === 0) tone(bass, nextBeat, length * 1.8, .3, "triangle", true);
      const d = tune.drums?.[beat % tune.drums.length];
      if (d === "k") kick(nextBeat);
      else if (d === "s") drum(nextBeat, .12, .45, 1800);
      else if (d === "h") drum(nextBeat, .04, .22, 7000);
      beat++;
      nextBeat += length;
    }
  }
  function syncMusic() {
    const wanted = !active() || !music ? "off" : scene;
    if (wanted === "off") { if (timer !== undefined || playing !== "off") stopMusic(); return; }
    if (timer !== undefined && playing === wanted) return;
    if (timer !== undefined) stopMusic();
    if (!context) return;
    playing = wanted;
    beat = 0;
    nextBeat = context.currentTime + .03;
    schedule();
    timer = setInterval(schedule, 80);
  }
  function unavailable() {
    enabled = false;
    stopMusic();
    stopVoices(false);
    onUnavailable();
  }

  return {
    /** Must be called from a user gesture; never queues old cues while locked. */
    async unlock({ quiet = false } = {}) {
      if (!enabled || disposed || !visible) return;
      try {
        if (!context) {
          context = createContext();
          master = context.createGain();
          master.gain.value = MASTER;
          // A compressor keeps loud overlaps from clipping and evens out levels.
          if (context.createDynamicsCompressor) {
            const comp = context.createDynamicsCompressor();
            comp.threshold.value = -14;
            comp.ratio.value = 6;
            master.connect(comp);
            comp.connect(context.destination);
          } else master.connect(context.destination);
          musicBus = context.createGain();
          musicBus.gain.value = LEVELS.music;
          musicBus.connect(master);
          context.onstatechange = () => {
            if (context?.state !== "running") stopVoices(false);
            syncMusic();
          };
        }
        if (context.state !== "running") await context.resume();
        syncMusic(); // Re-check mute/visibility/disposal after asynchronous resume.
      } catch {
        // An automatic attempt before any gesture may be refused; stay quiet and wait for a click.
        if (quiet) return;
        unavailable();
      }
    },
    /** @param {boolean} value */
    setEnabled(value) {
      enabled = value;
      if (!value) { stopMusic(); stopVoices(false); lastCue.clear(); }
      else syncMusic();
    },
    /** @param {boolean} value */
    setMusic(value) { music = value; syncMusic(); },
    /** Chooses the tune: lobby, waiting, countdown or race. @param {Scene} value */
    setScene(value) { if (scene !== value) { scene = value; syncMusic(); } },
    /** Back-compat for callers that only know racing / not racing. @param {boolean} value */
    setRacing(value) { this.setScene(value ? "race" : scene === "race" ? "waiting" : scene); },
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
      if (now - (lastCue.get(cue) ?? -Infinity) < (cue === "bump" ? .25 : cue === "step" ? .06 : .09)) return;
      lastCue.set(cue, now);
      // Make room for a result: stop the music and let the jingle ring out.
      if (cue === "win" || cue === "lose" || cue === "end") { scene = "off"; stopMusic(); stopVoices(false); }
      for (const [note, delay, length, opts] of EFFECTS[cue]) {
        tone(note, now + .005 + delay, length, EFFECT_GAIN * (opts?.level ?? 1), opts?.type ?? "square", false, opts?.slideTo);
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
