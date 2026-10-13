# Harness

Shared Space: a small team arranges an event room together. The README's
definition of good is the source of these rules; when they disagree, the README
wins and this file gets fixed.

## Product rules

- Never overwrite someone else's saved move. Every change to an object carries
  the version it was based on; the server refuses a stale one (409) and the
  interface shows where the object actually is.
- Invalid layouts are allowed in a draft. A clash is reported as a problem with
  the objects and distances named, never blocked silently or hidden.
- "Saved" means committed to SQLite on the `/data` volume. Don't show a change
  as saved before the server confirms it.
- Every action that works by dragging also works by keyboard and by buttons or
  fields. No feature ships drag-only.
- Remote updates must not steal focus, clear an input being typed in, or reset
  the selection.
- A drag in progress is shown to others as a preview, never saved. Previews and
  presence are SSE named events without an `id:`, so they are never replayed;
  only saved changes carry the history seq.
- A preview carries the version it was based on; one that no longer matches is
  refused so a stale ghost never reappears.
- The page must recover from a closed stream by itself and resume after the
  last applied seq. The machine stops when idle, so a restart is normal.

## How to work

- Stack: Node 24 running `server.ts` directly, built-in `node:sqlite`, plain
  HTML/CSS/JS in `public/`. No framework or runtime dependency without a reason
  written in PROCESS.md — the machine has 256 MB.
- A promise the app makes gets a check in `spec/` that runs against the running
  app. Write the check before or with the change, and watch it fail first.
- After any server change: run the app, then `pnpm check` against it. Report
  what actually ran; don't claim a check passed that wasn't run.
- SSE responses must write something immediately after headers (Node buffers
  headers until the first write — this broke the stream once).
- Server logs are JSON lines with an `action` and `outcome`; never log tokens,
  cookies or comment text.
- Commit in small, single-purpose units.
