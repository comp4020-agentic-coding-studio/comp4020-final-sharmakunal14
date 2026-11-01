import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import type { Game } from "../maze-game.ts";

async function start(directory: string) {
  const child = spawn(process.execPath, ["--disable-warning=ExperimentalWarning", "server.ts"], {
    env: { ...process.env, PORT: "0", DATA_DIR: directory }, stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  const url = await new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => { child.kill(); reject(new Error("Local restart-test server did not start")); }, 5_000);
    child.once("error", (error) => { clearTimeout(timer); reject(error); });
    child.once("exit", () => { clearTimeout(timer); reject(new Error("Local restart-test server exited before startup")); });
    child.stdout.on("data", (chunk: Buffer) => {
      output += chunk.toString();
      const line = output.split("\n").find((value) => value.includes('"action":"listening"'));
      if (!line) return;
      const data = JSON.parse(line) as { port: number };
      clearTimeout(timer);
      resolve(`http://127.0.0.1:${data.port}`);
    });
    child.stderr.resume();
  });
  return {
    url,
    async stop() {
      if (child.exitCode !== null || child.signalCode !== null) return;
      const exit = once(child, "exit");
      child.kill("SIGTERM");
      await exit;
    },
  };
}

it("retains both browser sessions and interrupts an active match after a real server restart", async () => {
  const directory = mkdtempSync(join(tmpdir(), "maze-restart-"));
  let server = await start(directory);
  try {
    const cookies: string[] = [];
    for (const name of ["Alice", "Bob"]) {
      const response = await fetch(`${server.url}/api/session`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) });
      expect(response.status).toBe(201);
      cookies.push(response.headers.get("set-cookie")!.split(";")[0]);
    }
    const post = (cookie: string, path: string) => fetch(`${server.url}/api/maze/${path}`, { method: "POST", headers: { cookie, "content-type": "application/json" }, body: "{}" });
    const { game } = await (await post(cookies[0], "matches")).json() as { game: Game };
    const path = `matches/${game.id}`;
    await post(cookies[1], `${path}/join`);
    await post(cookies[0], `${path}/ready`);
    const before = await (await post(cookies[1], `${path}/ready`)).json() as { game: Game };
    expect(before.game.status).toBe("countdown");
    await server.stop();
    server = await start(directory);
    for (const cookie of cookies) {
      const response = await fetch(`${server.url}/api/maze/${path}`, { headers: { cookie } });
      expect(response.status).toBe(200);
      const after = await response.json() as { game: Game };
      expect(after.game).toMatchObject({ status: "interrupted", interruption: "server_restart", winnerId: null, players: before.game.players });
    }
  } finally {
    await server.stop();
    rmSync(directory, { recursive: true, force: true });
  }
});
