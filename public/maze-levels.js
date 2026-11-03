// The campaign (decision 0013): four worlds of three fixed levels. Shared by
// the server (which builds each maze from `spec`) and the browser (which shows
// names, worlds and colours). A level's maze id is `level-<id>`. `seed`, when
// present, was chosen because the plain id produced a maze missing one of the
// level's mechanics; spec/maze-levels.test.ts checks every level has them.

export const WORLDS = [
  { id: 1, name: "The Forgotten Gardens", tag: "Easy · learning navigation",
    theme: { wall: "#5f8a4e", top: "#86b26b", floor: "#c9b98d", sky: ["#bfe6ff", "#f3f7d9"], fog: "#d7e8cf", ground: "#7da35f" } },
  { id: 2, name: "The Temple of Choices", tag: "Medium · strategy and switches",
    theme: { wall: "#8b8478", top: "#b3ab9b", floor: "#d6c7a6", sky: ["#2b2440", "#c98f5a"], fog: "#c9b8a0", ground: "#9a8a6c" } },
  { id: 3, name: "The Clockwork Citadel", tag: "Hard · timing",
    theme: { wall: "#6b5338", top: "#b8893f", floor: "#4d4a44", sky: ["#3a3f4b", "#b4835a"], fog: "#9d927f", ground: "#3b3833" } },
  { id: 4, name: "The Fractured Dimension", tag: "Expert · mastery",
    theme: { wall: "#2c2450", top: "#7b5cff", floor: "#1b1a2e", sky: ["#07061a", "#3b1c6b"], fog: "#3a2d63", ground: "#141225" } },
];

const P = [2_500, 2_500];
export const LEVELS = [
  { id: "1-1", world: 1, name: "First Steps", teaches: "Find the other portal.", spec: { cells: 4, switches: false, pulses: [], rifts: false } },
  { id: "1-2", world: 1, name: "The Wrong Turn", teaches: "Loops and dead ends: more than one way through.", spec: { cells: 5, switches: false, pulses: [], rifts: false, loops: 0.25 } },
  { id: "1-3", world: 1, name: "Into the Mist", teaches: "Fog: remember where you have been.", fog: true, spec: { cells: 6, switches: false, pulses: [], rifts: false, loops: 0.15 } },
  { id: "2-1", world: 2, name: "The Twin Levers", teaches: "A switch opens one gate and closes another, for both of you.", spec: { cells: 5, switches: true, pulses: [], rifts: false } },
  { id: "2-2", world: 2, name: "Hall of Choices", teaches: "Your rival can undo your switch.", spec: { cells: 6, switches: true, pulses: [], rifts: false, loops: 0.1 } },
  { id: "2-3", world: 2, name: "The Shortcut Gamble", teaches: "A timed shortcut, or the safe way round?", spec: { cells: 6, switches: true, pulses: [P], rifts: false } },
  { id: "3-1", world: 3, name: "Pulse Gates", seed: "level-3-1#1", teaches: "Gates open and close on a clock.", spec: { cells: 6, switches: false, pulses: [P], rifts: false } },
  { id: "3-2", world: 3, name: "Gears Out of Step", seed: "level-3-2#1", teaches: "Two gates, two rhythms.", spec: { cells: 6, switches: false, pulses: [[1_500, 2_500], [3_000, 2_000]], rifts: false } },
  { id: "3-3", world: 3, name: "The Great Mechanism", teaches: "Timing and switches together.", spec: { cells: 7, switches: true, pulses: [P, [2_000, 3_000]], rifts: false } },
  { id: "4-1", world: 4, name: "Portal Paradox", teaches: "Rifts link distant places.", spec: { cells: 6, switches: false, pulses: [], rifts: true } },
  { id: "4-2", world: 4, name: "Shifting Reality", seed: "level-4-2#10", teaches: "Rifts and gates on a clock.", spec: { cells: 7, switches: false, pulses: [P], rifts: true } },
  { id: "4-3", world: 4, name: "The Final Rift", teaches: "Everything you have learned, in the fog.", fog: true, spec: { cells: 7, switches: true, pulses: [P, [1_800, 2_800]], rifts: true, loops: 0.1 } },
];

export const levelById = (id) => LEVELS.find((l) => l.id === id) ?? null;
export const worldOf = (level) => WORLDS.find((w) => w.id === level.world);
export const nextLevel = (id) => LEVELS[LEVELS.findIndex((l) => l.id === id) + 1] ?? null;
export const mazeIdOf = (level) => `level-${level.id}`;
