import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { expect, it } from "vitest";

// The HTTP checks only fetch these files; a syntax error would still blank the
// game page. One broken module once shipped green this way.
it("every browser module in public/ parses", () => {
  const files = readdirSync("public").filter((f) => f.endsWith(".js"));
  expect(files.length).toBeGreaterThan(5);
  for (const file of files) {
    expect(() => execFileSync(process.execPath, ["--check", `public/${file}`], { stdio: "pipe" }), file).not.toThrow();
  }
});
