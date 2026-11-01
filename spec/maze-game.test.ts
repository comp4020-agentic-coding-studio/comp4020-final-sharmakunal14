import { describe, expect, it } from "vitest";
import { advanceGame, applyActions, BURST, COUNTDOWN_MS, entrance, joinGame, layoutFor, MOVE_INTERVAL_MS, movePlayer, newGame, RACE_LIMIT_MS, readyPlayer, SWITCH_COOLDOWN_MS } from "../maze-game.ts";
import type { Game } from "../maze-game.ts";
import { generate, sydneyDate } from "../maze-gen.ts";
import { DIRECTIONS } from "../public/maze-rules.js";
import { reachable, route } from "./maze-path.ts";

const alice = { id: "alice", name: "Alice" }, bob = { id: "bob", name: "Bob" };
const LAYOUT = layoutFor("2026-11-01");
const ready = (layout = LAYOUT) => readyPlayer(readyPlayer(joinGame(newGame("test", alice, 0, layout), bob), alice.id, 0), bob.id, 0);
const racing = (layout = LAYOUT) => advanceGame(ready(layout), COUNTDOWN_MS);
const rotate = <T extends { x: number; y: number }>(p: T, size: number) => ({ x: size - 1 - p.x, y: size - 1 - p.y });

// Positions a player directly, bypassing movement, to set up a rule check.
const place = (game: Game, id: string, at: { x: number; y: number }): Game =>
  ({ ...game, players: game.players.map((p) => p.id === id ? { ...p, ...at } : p) });

describe("daily maze generation", () => {
  it("is deterministic per Sydney date and changes between days", () => {
    expect(generate("2026-11-01")).toEqual(generate("2026-11-01"));
    expect(generate("2026-11-02").maze).not.toEqual(generate("2026-11-01").maze);
    expect(sydneyDate(Date.parse("2026-11-01T13:30:00Z"))).toBe("2026-11-02");
  });

  it("over 200 seeds: symmetric layout, switches and gates, and every cell reaches both goals in every switch state", () => {
    for (let day = 0; day < 200; day++) {
      const layout = generate(`seed-${day}`), size = layout.maze.length;
      expect(layout.maze.map((row) => [...row].reverse().join("")).reverse()).toEqual(layout.maze);
      expect(layout.switches).toHaveLength(2);
      expect(layout.switches[1]).toEqual(rotate(layout.switches[0], size));
      expect(layout.gates).toHaveLength(4);
      for (const gate of layout.gates) {
        expect(layout.maze[gate.y][gate.x]).toBe("#");
        expect(layout.gates).toContainEqual({ ...rotate(gate, size), switch: 1 - gate.switch, openWhen: gate.openWhen });
      }
      for (const switchOn of [[false, false], [true, false], [false, true], [true, true]]) {
        const board = { ...layout, switchOn };
        for (const slot of [0, 1]) {
          const reached = reachable(board, entrance(board, slot));
          for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
            if (layout.maze[y][x] === ".") expect(reached.has(`${x},${y}`)).toBe(true);
          }
        }
      }
    }
  });

  it("gives each player the same shortest distance whatever the switches", () => {
    for (const switchOn of [[false, false], [true, true]]) {
      const board = { ...LAYOUT, switchOn };
      expect(route(board).length).toBe(route(board, entrance(board, 1), entrance(board, 0)).length);
    }
  });
});

describe("race rules", () => {
  it("starts once after two distinct players ready up, and rejects a third", () => {
    const one = newGame("test", alice, 0, LAYOUT);
    expect(joinGame(one, alice)).toBe(one);
    expect(readyPlayer(one, alice.id, 0).startsAt).toBeNull();
    const game = ready();
    expect(game.startsAt).toBe(COUNTDOWN_MS);
    expect(readyPlayer(game, bob.id, 100)).toBe(game);
    expect(() => joinGame(game, { id: "third", name: "Third" })).toThrow(/two players/);
    expect(() => readyPlayer(game, "third", 0)).toThrow(/Join/);
  });

  it("enforces the countdown, walls, membership and sequencing", () => {
    const first = route(LAYOUT)[0];
    expect(() => movePlayer(ready(), alice.id, first, 1, 1)).toThrow(/only during/);
    const game = racing();
    const blocked = (Object.keys(DIRECTIONS) as (keyof typeof DIRECTIONS)[]).find((d) => {
      const [dx, dy] = DIRECTIONS[d];
      return LAYOUT.maze[1 + dy][1 + dx] === "#";
    })!;
    expect(() => movePlayer(game, "stranger", first, 1, COUNTDOWN_MS)).toThrow(/Only/);
    expect(() => movePlayer(game, alice.id, blocked, 1, COUNTDOWN_MS)).toThrow(/wall/);
    expect(() => movePlayer(game, alice.id, first, 2, COUNTDOWN_MS)).toThrow(/position changed/);
    const moved = movePlayer(game, alice.id, first, 1, COUNTDOWN_MS);
    expect(movePlayer(moved, alice.id, first, 1, COUNTDOWN_MS + 1)).toBe(moved);
  });

  it("allows a short burst of banked steps but holds the average speed", () => {
    const path = route(LAYOUT);
    const later = COUNTDOWN_MS + 10 * MOVE_INTERVAL_MS;
    const burst = applyActions(racing(), alice.id, 1, path.slice(0, BURST + 1), later);
    expect(burst.log).toHaveLength(BURST);
    expect(burst.error?.code).toBe("TOO_FAST");
    const retried = applyActions(burst.game, alice.id, 1, path.slice(0, BURST + 1), later);
    expect(retried.log).toHaveLength(0);
    expect(retried.game.players[0]).toMatchObject({ sequence: BURST });
    const resumed = applyActions(burst.game, alice.id, BURST + 1, [path[BURST]], later + MOVE_INTERVAL_MS);
    expect(resumed.error).toBeNull();
  });

  it("flips a switch only when standing on it, for both players, with a cooldown and never onto a player", () => {
    let game = racing();
    const sw = game.switches[0];
    expect(applyActions(game, alice.id, 1, ["flip"], COUNTDOWN_MS).error?.code).toBe("NO_SWITCH");
    game = place(game, alice.id, sw);
    const flipped = applyActions(game, alice.id, 1, ["flip"], COUNTDOWN_MS);
    expect(flipped.error).toBeNull();
    expect(flipped.game.switchOn).toEqual([true, false]);
    expect(flipped.log[0]).toMatchObject({ kind: "flip", switch: 0, on: true });
    expect(applyActions(flipped.game, alice.id, 2, ["flip"], COUNTDOWN_MS + 100).error?.code).toBe("SWITCH_COOLDOWN");
    const occupied = game.gates.find((g) => g.switch === 0 && g.openWhen)!;
    const blocking = place(flipped.game, bob.id, occupied);
    expect(applyActions(blocking, alice.id, 2, ["flip"], COUNTDOWN_MS + SWITCH_COOLDOWN_MS).error?.code).toBe("GATE_OCCUPIED");
  });

  it("lets an open gate be walked through and refuses a closed one", () => {
    const game = racing();
    const gate = game.gates.find((g) => g.switch === 0 && g.openWhen)!;
    const step = (Object.keys(DIRECTIONS) as (keyof typeof DIRECTIONS)[]).find((d) => {
      const [dx, dy] = DIRECTIONS[d];
      return LAYOUT.maze[gate.y - dy]?.[gate.x - dx] === ".";
    })!;
    const [dx, dy] = DIRECTIONS[step];
    const before = place(game, alice.id, { x: gate.x - dx, y: gate.y - dy });
    expect(applyActions(before, alice.id, 1, [step], COUNTDOWN_MS).error?.message).toMatch(/gate is closed/);
    const open = { ...before, switchOn: [true, false] };
    expect(applyActions(open, alice.id, 1, [step], COUNTDOWN_MS).game.players[0]).toMatchObject({ x: gate.x, y: gate.y });
  });

  it("allows players to cross, settles one winner, and refuses subsequent moves", () => {
    let game: Game = racing();
    const path = route(game);
    const reversed = route(game, entrance(game, 1), entrance(game, 0));
    for (let i = 0; i < path.length; i++) {
      const time = COUNTDOWN_MS + i * MOVE_INTERVAL_MS;
      game = movePlayer(game, alice.id, path[i], i + 1, time);
      if (i < path.length - 1) game = movePlayer(game, bob.id, reversed[i], i + 1, time);
    }
    expect(game.status).toBe("finished");
    expect(game.winnerId).toBe(alice.id);
    expect(() => movePlayer(game, bob.id, reversed.at(-1)!, path.length, COUNTDOWN_MS + path.length * MOVE_INTERVAL_MS)).toThrow(/only during/);
  });

  it("ends abandoned races after the fixed time limit", () => {
    expect(advanceGame(ready(), COUNTDOWN_MS + RACE_LIMIT_MS)).toMatchObject({ status: "interrupted", interruption: "time_limit", winnerId: null });
  });
});
