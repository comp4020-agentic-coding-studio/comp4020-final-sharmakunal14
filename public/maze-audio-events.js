// @ts-check
/** @typedef {{revision: number, status: string, winnerId: string | null,
 * switchOn: boolean[], players: {id: string, ready: boolean}[]}} SoundState */

/** Compare confirmed snapshots only. The caller silently establishes reconnect baselines.
 * @param {SoundState} before @param {SoundState} after @param {string} me
 * @returns {import('./maze-audio.js').Cue[]} */
export function raceCues(before, after, me) {
  if (after.revision <= before.revision) return [];
  /** @type {import('./maze-audio.js').Cue[]} */
  const cues = [];
  if (before.status === "waiting" && !before.players.find(p => p.id === me)?.ready &&
      after.players.find(p => p.id === me)?.ready) cues.push("ready");
  if (before.status === "racing" && after.switchOn.some((on, i) => on !== before.switchOn[i])) cues.push("flip");
  if (before.status !== after.status) {
    if (after.status === "racing") cues.push("go");
    if (after.status === "finished") cues.push(after.winnerId === me ? "win" : "lose");
    if (after.status === "interrupted") cues.push("end");
  }
  return cues;
}
