import { describe, expect, it } from "vitest";
import { advanceGame, COUNTDOWN_MS, entrance, joinGame, MAZE, MOVE_INTERVAL_MS, movePlayer, newGame, RACE_LIMIT_MS, readyPlayer } from "../maze-game.ts";
import type { Game } from "../maze-game.ts";
import { route } from "./maze-path.ts";

const alice = { id: "alice", name: "Alice" }, bob = { id: "bob", name: "Bob" };
const ready = () => readyPlayer(readyPlayer(joinGame(newGame("test", alice, 0), bob), alice.id, 0), bob.id, 0);

describe("maze rules", () => {
  it("has a rotationally symmetric layout and every passage can reach either entrance", () => {
    expect(MAZE.map((row) => [...row].reverse().join("")).reverse()).toEqual([...MAZE]);
    expect(route(MAZE).length).toBeGreaterThan(20);
    for (let y = 0; y < MAZE.length; y++) for (let x = 0; x < MAZE[y].length; x++) {
      if (MAZE[y][x] === ".") expect(() => route(MAZE, { x, y })).not.toThrow();
    }
  });

  it("starts once after two distinct players ready up, and rejects a third", () => {
    const one = newGame("test", alice, 0);
    expect(joinGame(one, alice)).toBe(one);
    expect(readyPlayer(one, alice.id, 0).startsAt).toBeNull();
    const game = ready();
    expect(game.startsAt).toBe(COUNTDOWN_MS);
    expect(readyPlayer(game, bob.id, 100)).toBe(game);
    expect(() => joinGame(game, { id: "third", name: "Third" })).toThrow(/two players/);
    expect(() => readyPlayer(game, "third", 0)).toThrow(/Join/);
  });

  it("enforces the countdown, walls, membership, sequencing and server movement interval", () => {
    expect(() => movePlayer(ready(), alice.id, "right", 1, 1)).toThrow(/only during/);
    const game = advanceGame(ready(), COUNTDOWN_MS);
    expect(() => movePlayer(game, "stranger", "right", 1, COUNTDOWN_MS)).toThrow(/Only/);
    expect(() => movePlayer(game, alice.id, "up", 1, COUNTDOWN_MS)).toThrow(/wall/);
    expect(() => movePlayer(game, alice.id, "right", 2, COUNTDOWN_MS)).toThrow(/position changed/);
    const moved = movePlayer(game, alice.id, "right", 1, COUNTDOWN_MS);
    expect(movePlayer(moved, alice.id, "right", 1, COUNTDOWN_MS + 1)).toBe(moved);
    expect(() => movePlayer(moved, alice.id, "right", 2, COUNTDOWN_MS + 1)).toThrow(/slowly/);
  });

  it("allows players to cross, settles one winner, and refuses subsequent moves", () => {
    let game: Game = advanceGame(ready(), COUNTDOWN_MS);
    const path = route(MAZE);
    const reversed = route(MAZE, entrance(1), entrance(0));
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
