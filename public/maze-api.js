export class ApiError extends Error {
  /** @param {string} message @param {string} code @param {number} status
   * @param {Record<string, unknown> | null} body */
  constructor(message, code, status, body = null) {
    super(message);
    this.code = code;
    this.status = status;
    this.body = body;
  }
}

export async function request(path, body) {
  let response;
  try {
    response = await fetch(path, {
      method: body === undefined ? "GET" : "POST",
      headers: body === undefined ? {} : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "same-origin",
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    throw new ApiError("Could not confirm that request. Check your connection and recent races before trying again.", "NETWORK", 0);
  }
  const value = await response.json();
  if (!response.ok) throw new ApiError(value.message ?? "The request could not be completed.", value.code, response.status, value);
  return value;
}

export function raceId(value) {
  try {
    const url = new URL(value.trim(), location.origin);
    if (url.origin !== location.origin) return null;
    return /^\/race\/([a-f0-9-]{36})\/?$/.exec(url.pathname)?.[1] ?? null;
  } catch { return null; }
}
