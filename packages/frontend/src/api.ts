export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

function authHeaders() {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

export async function register(payload: { name?: string; email: string; password: string }) {
  const res = await fetch(`${API_BASE}/api/auth/register`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(payload), credentials: 'include' });
  return res.json();
}

export async function login(payload: { email: string; password: string }) {
  const res = await fetch(`${API_BASE}/api/auth/login`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(payload), credentials: 'include' });
  return res.json();
}

export async function refresh() {
  const res = await fetch(`${API_BASE}/api/auth/refresh`, { method: 'POST', credentials: 'include' });
  return res.json();
}

export async function me() {
  const res = await fetch(`${API_BASE}/api/me`, { headers: authHeaders() });
  return res.json();
}

export async function getServers() {
  const res = await fetch(`${API_BASE}/api/servers`, { headers: authHeaders() });
  return res.json();
}

export async function getChannels(serverId: string) {
  const res = await fetch(`${API_BASE}/api/servers/${serverId}/channels`, { headers: authHeaders() });
  return res.json();
}

export async function getMessages(channelId: string, limit = 50) {
  const res = await fetch(`${API_BASE}/api/channels/${channelId}/messages?limit=${limit}`, { headers: authHeaders() });
  return res.json();
}

export async function createServer(payload: { name: string; description?: string }) {
  const res = await fetch(`${API_BASE}/api/servers`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(payload) });
  return res.json();
}

export async function createChannel(serverId: string, payload: { name: string; type?: string }) {
  const res = await fetch(`${API_BASE}/api/servers/${serverId}/channels`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(payload) });
  return res.json();
}

export async function postMessage(channelId: string, payload: { content: string, attachments?: any }) {
  const res = await fetch(`${API_BASE}/api/channels/${channelId}/messages`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(payload) });
  return res.json();
}
