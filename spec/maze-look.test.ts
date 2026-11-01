import { describe, expect, it } from "vitest";
import { ACCESSORIES, defaultLook, FACES, FINISHES, lookOf, parseLook, SHAPES } from "../public/maze-look.js";
import { advanceGame, COUNTDOWN_MS, joinGame, layoutFor, newGame, readyPlayer, setLook } from "../maze-game.ts";

const alice = { id: "alice", name: "Alice" }, bob = { id: "bob", name: "Bob" };
const LAYOUT = layoutFor("2026-11-01");

describe("avatar looks", () => {
  it("keeps A green and B orange until a player chooses", () => {
    expect(defaultLook(0).hue).toBe(152);
    expect(defaultLook(1).hue).toBe(20);
    expect(lookOf({ slot: 1 })).toEqual(defaultLook(1)); // a game saved before looks existed
  });

  it("accepts every listed option and fills in what is missing", () => {
    for (const shape of SHAPES) for (const accessory of ACCESSORIES) for (const face of FACES) for (const finish of FINISHES) {
      expect(parseLook({ shape, accessory, face, finish, hue: 200 })).toEqual({ shape, accessory, face, finish, hue: 200 });
    }
    expect(parseLook({ shape: "robot" }, 1)).toEqual({ ...defaultLook(1), shape: "robot" });
  });

  it("refuses anything that is not a listed name or an integer hue from 0 to 359", () => {
    for (const bad of [null, [], "robot", { shape: "dragon" }, { accessory: "<img src=x onerror=alert(1)>" }, { face: 3 },
      { hue: 360 }, { hue: -1 }, { hue: 1.5 }, { hue: "red" }, { hue: "red; background: url(x)" }, { finish: null }]) {
      expect(parseLook(bad), JSON.stringify(bad)).toBeNull();
    }
  });

  it("drops unknown extra fields instead of storing them", () => {
    expect(Object.keys(parseLook({ shape: "blob", evil: "<b>" })!).sort()).toEqual(["accessory", "face", "finish", "hue", "shape"]);
  });
});

describe("seating a look", () => {
  const mine = { ...defaultLook(0), shape: "robot", hue: 270 }, theirs = { ...defaultLook(1), accessory: "crown" };

  it("stores each player's look from creating and joining", () => {
    const game = joinGame(newGame("t", alice, 0, LAYOUT, mine), bob, theirs);
    expect(game.players.map((p) => p.look)).toEqual([mine, theirs]);
    expect(newGame("t", alice, 0, LAYOUT).players[0]!.look).toEqual(defaultLook(0));
  });

  it("lets a player change only their own look, and only while waiting", () => {
    const waiting = joinGame(newGame("t", alice, 0, LAYOUT), bob);
    const changed = setLook(waiting, "bob", theirs);
    expect(changed.players[1]!.look).toEqual(theirs);
    expect(changed.players[0]!.look).toEqual(defaultLook(0));
    expect(setLook(changed, "bob", theirs)).toBe(changed); // unchanged: no new revision
    expect(() => setLook(waiting, "eve", mine)).toThrow(/Join this race/);
    const started = readyPlayer(readyPlayer(waiting, "alice", 0), "bob", 0);
    expect(() => setLook(started, "bob", mine)).toThrow(/locked/);
    expect(() => setLook(advanceGame(started, COUNTDOWN_MS), "bob", mine)).toThrow(/locked/);
  });
});

import { addChat, CHAT_BURST, CHAT_GAP_MS, CHAT_KEEP, CHAT_WINDOW_MS } from "../maze-game.ts";
import { cleanText, MAX_CHAT } from "../public/maze-chat-rules.js";

describe("chat", () => {
  const room = () => joinGame(newGame("t", alice, 0, LAYOUT), bob);

  it("cleans text: collapses spaces, strips control and direction characters, caps the length", () => {
    expect(cleanText("  hi \n\t there  ")).toBe("hi there");
    expect(cleanText("a‮b\u0000c​d")).toBe("a b c d");
    expect(cleanText("   ")).toBeNull();
    expect(cleanText(42)).toBeNull();
    expect(Array.from(cleanText("x".repeat(500))!)).toHaveLength(MAX_CHAT);
    expect(cleanText("<img src=x onerror=alert(1)>")).toBe("<img src=x onerror=alert(1)>"); // stored as text; the page never parses it as HTML
  });

  it("records text and named reactions from either player, in order", () => {
    let g = addChat(room(), "alice", { text: "good luck" }, 1_000);
    g = addChat(g, "bob", { reaction: "fire" }, 2_000);
    expect(g.chat).toEqual([
      { n: 1, at: 1_000, slot: 0, kind: "text", text: "good luck" },
      { n: 2, at: 2_000, slot: 1, kind: "reaction", text: "fire" },
    ]);
  });

  it("refuses outsiders, unknown reactions and empty text", () => {
    expect(() => addChat(room(), "eve", { text: "hi" }, 0)).toThrow(/Join this race/);
    for (const bad of [{ reaction: "💣" }, { reaction: "__proto__" }, { reaction: 5 }, { text: "" }, { text: "  " }, {}]) {
      expect(() => addChat(room(), "alice", bad, 0), JSON.stringify(bad)).toThrow();
    }
  });

  it("limits speed per player, not per room", () => {
    let g = addChat(room(), "alice", { text: "a" }, 1_000);
    expect(() => addChat(g, "alice", { text: "b" }, 1_000 + CHAT_GAP_MS - 1)).toThrow(/Slow down/);
    g = addChat(g, "bob", { text: "bob is not limited by alice" }, 1_001);
    for (let i = 1; i < CHAT_BURST; i++) g = addChat(g, "alice", { reaction: "clap" }, 1_000 + i * CHAT_GAP_MS);
    expect(() => addChat(g, "alice", { reaction: "clap" }, 1_000 + CHAT_BURST * CHAT_GAP_MS)).toThrow(/Slow down/);
    expect(addChat(g, "alice", { reaction: "clap" }, 1_000 + CHAT_WINDOW_MS + 1).chat!.at(-1)!.n).toBeGreaterThan(CHAT_BURST);
  });

  it("keeps only the latest lines", () => {
    let g = room();
    for (let i = 0; i < CHAT_KEEP + 10; i++) g = addChat(g, i % 2 ? "bob" : "alice", { reaction: "wow" }, i * CHAT_WINDOW_MS);
    expect(g.chat).toHaveLength(CHAT_KEEP);
    expect(g.chat!.at(-1)!.n).toBe(CHAT_KEEP + 10);
  });

  it("works during a race and after it ends, and never changes the race", () => {
    const started = advanceGame(readyPlayer(readyPlayer(room(), "alice", 0), "bob", 0), COUNTDOWN_MS);
    const talked = addChat(started, "bob", { reaction: "gg" }, COUNTDOWN_MS + 1);
    expect({ ...talked, chat: undefined, revision: 0 }).toEqual({ ...started, chat: undefined, revision: 0 });
  });
});
