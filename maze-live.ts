import type { ServerResponse } from "node:http";
import { advanceGame, GameError, MOVE_INTERVAL_MS } from "./maze-game.ts";
import type { Game, Identity } from "./maze-game.ts";
import type { MazeStore } from "./maze-store.ts";

type Peer = { res: ServerResponse; actor: Identity };
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
    const data = JSON.stringify({
      game: room.game, serverNow: Date.now(), moveInterval: MOVE_INTERVAL_MS,
      online: [...new Set([...room.peers].map((peer) => peer.actor.id))],
    });
    for (const { res } of room.peers) {
      // Drop a slow reader instead of accumulating an unbounded write queue.
      if (res.destroyed || res.writableLength > 65_536) { res.destroy(); continue; }
      res.write(`event: state\ndata: ${data}\n\n`);
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
      total++;
      if (peer.actor.id === actor.id) own++;
    }
    if (total >= 128 || own >= 4) throw new GameError("STREAM_LIMIT", "Too many open game tabs. Close another tab and retry.", 429);
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
