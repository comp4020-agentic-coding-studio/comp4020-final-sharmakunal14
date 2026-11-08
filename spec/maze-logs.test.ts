import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import type { Game } from "../maze-game.ts";
import { MOVE_INTERVAL_MS } from "../maze-game.ts";
import { route } from "./maze-path.ts";

// The fly logs must be able to narrate a race: who created, joined, readied,
// moved, flipped, won, forfeited or was refused. Starts its own server so it
// can read the log lines the server prints.
it("logs every maze action with actor, short race id and outcome, and never secrets, chat or names", async () => {
  const directory = mkdtempSync(join(tmpdir(), "maze-logs-"));
  const child = spawn(process.execPath, ["--disable-warning=ExperimentalWarning", "server.ts"], {
    env: { ...process.env, PORT: "0", DATA_DIR: directory }, stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (chunk: Buffer) => { output += chunk.toString(); });
  child.stderr.resume();
  try {
    const url = await new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("log-test server did not start")), 5_000);
      const check = () => {
        const line = output.split("\n").find((value) => value.includes('"action":"listening"'));
        if (line) { clearTimeout(timer); resolve(`http://127.0.0.1:${(JSON.parse(line) as { port: number }).port}`); }
        else setTimeout(check, 20);
      };
      check();
    });
    const cookies: string[] = [];
    for (const name of ["Alicename", "Bobname"]) {
      const response = await fetch(`${url}/api/session`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) });
      cookies.push(response.headers.get("set-cookie")!.split(";")[0]);
    }
    const post = (cookie: string, path: string, body: unknown = {}) =>
      fetch(`${url}/api/maze/${path}`, { method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify(body) });
    const { game } = await (await post(cookies[0], "matches")).json() as { game: Game };
    const path = `matches/${game.id}`;
    await post(cookies[1], `${path}/join`);
    await post(cookies[0], `${path}/chat`, { text: "secret-chat-line" });
    await post(cookies[0], `${path}/move`, { actions: ["up"], sequence: 1 }); // refused: not racing
    await post(cookies[0], `${path}/ready`);
    const { game: started } = await (await post(cookies[1], `${path}/ready`)).json() as { game: Game };
    await new Promise((resolve) => setTimeout(resolve, started.startsAt! - Date.now() + 20));
    const steps = route(started);
    let sequence = 1;
    for (let i = 0; i < steps.length; i += 4) {
      await new Promise((resolve) => setTimeout(resolve, 4 * MOVE_INTERVAL_MS + 5));
      const body = await (await post(cookies[0], `${path}/move`, { actions: steps.slice(i, i + 4), sequence })).json() as { game: Game };
      sequence = body.game.players[0].sequence + 1;
      if (body.game.status === "finished") break;
    }
    await post(cookies[1], `${path}/rematch`);
    await new Promise((resolve) => setTimeout(resolve, 100));

    const lines = output.split("\n").filter((l) => l.includes('"maze.')).map((l) => JSON.parse(l) as Record<string, unknown>);
    const actions = lines.map((l) => `${l.action}:${l.outcome}`);
    for (const expected of ["maze.created:ok", "maze.joined:ok", "maze.chat:ok", "maze.moved:NOT_RACING", "maze.ready:ok", "maze.moved:ok", "maze.finished:ok", "maze.rematch:ok"]) {
      expect(actions, expected).toContain(expected);
    }
    for (const line of lines) {
      expect(typeof line.at).toBe("string");
      if (line.race !== undefined) expect(line.race).toBe(game.id.slice(0, 8));
    }
    const finished = lines.find((l) => l.action === "maze.finished")!;
    expect(finished.timeMs).toBeGreaterThan(0);
    // Never secrets, chat text, nicknames or the full race id (it is the invitation).
    const raw = output.split("\n").filter((l) => l.includes('"maze.')).join("\n");
    for (const forbidden of [...cookies.map((c) => c.split("=")[1]), "secret-chat-line", "Alicename", "Bobname", game.id]) {
      expect(raw).not.toContain(forbidden);
    }
  } finally {
    const exit = once(child, "exit");
    child.kill("SIGTERM");
    await exit;
    rmSync(directory, { recursive: true, force: true });
  }
}, 30_000);
