import { io } from "socket.io-client";

export const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

export async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json()).error || `Request failed: ${path}`);
  return res.json();
}

export async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error((await res.json()).error || `Request failed: ${path}`);
  return res.json();
}

function authHeaders(token) {
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

export async function authGet(path, token) {
  const res = await fetch(`${API_BASE}${path}`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error((await res.json()).error || `Request failed: ${path}`);
  return res.json();
}

export async function authPatch(path, body, token) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json()).error || `Request failed: ${path}`);
  return res.json();
}

export async function authPost(path, body, token) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json()).error || `Request failed: ${path}`);
  return res.json();
}

export async function authDelete(path, token) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error((await res.json()).error || `Request failed: ${path}`);
  return res.json();
}

let socket;
export function getSocket() {
  if (!socket) socket = io(API_BASE, { autoConnect: true });
  return socket;
}
