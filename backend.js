const API_BASE = 'http://localhost:8000';

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

export async function submitScore(username, password, game) {
  const token = await login(username, password);
  return saveGame(token, game);
}
