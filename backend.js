// Thin client for the memory-backend API (Symfony app on :8000).
// CORS on the backend is permissive (allow_origin '*'), so cross-origin
// fetches from the game's dev server are accepted.

const API_BASE = 'http://localhost:8000';

/**
 * Logs a player in and returns their JWT.
 * @throws {Error} with `.status` set on failure (401 = bad credentials).
 */
export async function login(username, password) {
  const res = await fetch(`${API_BASE}/memory/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const error = new Error(
      res.status === 401 ? 'Invalid username or password' : `Login failed (${res.status})`,
    );
    error.status = res.status;
    throw error;
  }

  const data = await res.json();
  return data.token;
}

/**
 * Saves a game for the authenticated player.
 * @param {string} token  JWT from login()
 * @param {{score:number, api?:string, color_found?:string, color_closed?:string}} game
 */
export async function saveGame(token, game) {
  const res = await fetch(`${API_BASE}/game/save`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(game),
  });

  if (!res.ok) {
    const error = new Error(`Save failed (${res.status})`);
    error.status = res.status;
    throw error;
  }

  return res.json().catch(() => ({}));
}

/** Convenience: log in and save a game in one call. */
export async function submitScore(username, password, game) {
  const token = await login(username, password);
  return saveGame(token, game);
}
