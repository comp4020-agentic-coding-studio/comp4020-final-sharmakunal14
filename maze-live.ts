import type { ServerResponse } from "node:http";
import { advanceGame, GameError, MOVE_INTERVAL_MS, publicGame } from "./maze-game.ts";
import type { Game, Identity } from "./maze-game.ts";
import type { MazeStore } from "./maze-store.ts";

// A spectator is a peer with no identity: it can read, never act, and does not count as present.
type Peer = { res: ServerResponse; actor: Identity | null };
const MAX_PLAYER_STREAMS = 128, MAX_SPECTATOR_STREAMS = 64, MAX_SPECTATORS_PER_RACE = 20;
type Room = { game: Game; peers: Set<Peer> };

export class MazeLive {
  private readonly rooms = new Map<string, Room>();
  private readonly store: MazeStore;
  private heartbeatAt = Date.now();

  constructor(store: MazeStore) {
    this.store = store;
    setInterval(() => this.tick(), 100).unref();
  }

  private send(room: Room): void {
    const players = [...room.peers].filter((peer) => peer.actor);
    const watching = room.peers.size - players.length;
    const shared = {
      serverNow: Date.now(), moveInterval: MOVE_INTERVAL_MS, watching,
      online: [...new Set(players.map((peer) => peer.actor!.id))],
    };
    const forPlayers = JSON.stringify({ game: room.game, ...shared });
    const forWatchers = watching ? JSON.stringify({ game: publicGame(room.game), ...shared }) : "";
    for (const { res, actor } of room.peers) {
      // Drop a slow reader instead of accumulating an unbounded write queue.
      if (res.destroyed || res.writableLength > 65_536) { res.destroy(); continue; }
      res.write(`event: state\ndata: ${actor ? forPlayers : forWatchers}\n\n`);
    }
  }

  publish(game: Game): void {
    const room = this.rooms.get(game.id);
    if (!room) return;
    room.game = game;
    this.send(room);
  }

  open(res: ServerResponse, actor: Identity, game: Game): void {
    let total = 0, own = 0;
    for (const room of this.rooms.values()) for (const peer of room.peers) {
      if (!peer.actor) continue;
      total++;
      if (peer.actor.id === actor.id) own++;
    }
    if (total >= MAX_PLAYER_STREAMS || own >= 4) throw new GameError("STREAM_LIMIT", "Too many open game tabs. Close another tab and retry.", 429);
    this.attach(res, actor, game);
  }

  // Read-only view of a race for anyone holding its spectator link.
  watch(res: ServerResponse, game: Game): void {
    let total = 0;
    for (const room of this.rooms.values()) for (const peer of room.peers) if (!peer.actor) total++;
    const here = [...(this.rooms.get(game.id)?.peers ?? [])].filter((peer) => !peer.actor).length;
    if (total >= MAX_SPECTATOR_STREAMS || here >= MAX_SPECTATORS_PER_RACE) throw new GameError("STREAM_LIMIT", "This race has too many spectators right now. Try again shortly.", 429);
    this.attach(res, null, game);
  }

  private attach(res: ServerResponse, actor: Identity | null, game: Game): void {
    const room = this.rooms.get(game.id) ?? { game, peers: new Set<Peer>() };
    room.game = game;
    this.rooms.set(game.id, room);
    const peer = { res, actor };
    room.peers.add(peer);
    res.writeHead(200, {
      "content-type": "text/event-stream", "cache-control": "no-cache, no-transform",
      connection: "keep-alive", "x-accel-buffering": "no",
    });
    res.write(": connected\nretry: 1000\n\n");
    res.on("close", () => {
      room.peers.delete(peer);
      if (room.peers.size === 0) this.rooms.delete(game.id);
      else this.send(room);
    });
    // Every connection receives a full authoritative snapshot; missing any
    // number of frames is safe, including after a server restart.
    this.send(room);
  }

  private tick(): void {
    const now = Date.now(), heartbeat = now - this.heartbeatAt >= 10_000;
    if (heartbeat) this.heartbeatAt = now;
    for (const room of this.rooms.values()) {
      try {
        if (advanceGame(room.game, now) !== room.game) this.publish(this.store.current(room.game.id, now));
        else if (heartbeat) this.send(room);
      } catch {
        console.error(JSON.stringify({ action: "maze.stream", outcome: "state_read_failed" }));
        for (const peer of room.peers) peer.res.destroy();
      }
    }
  }
}
