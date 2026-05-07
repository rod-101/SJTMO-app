const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const handleResponse = async (res) => {
  const text = await res.text();
  if (!text) throw new Error("Server returned an empty response");
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Server error (${res.status}): ${text.slice(0, 120)}`);
  }
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
};

// ── Auth ──────────────────────────────────────────────────────────────────────
export const login = (email, password) =>
  fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  }).then(handleResponse);

// ── Violations ────────────────────────────────────────────────────────────────
export const getViolations = (motoristName = null) => {
  const url = motoristName
    ? `${BASE_URL}/violations?motorist=${encodeURIComponent(motoristName)}`
    : `${BASE_URL}/violations`;
  return fetch(url).then(handleResponse);
};

export const createViolation = (data) =>
  fetch(`${BASE_URL}/violations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then(handleResponse);

export const updateViolationStatus = (id, status) =>
  fetch(`${BASE_URL}/violations/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  }).then(handleResponse);

export const getViolationTypes = () =>
  fetch(`${BASE_URL}/violations/types`).then(handleResponse);

export const addViolationType = (name) =>
  fetch(`${BASE_URL}/violations/types`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  }).then(handleResponse);

export const updateViolation = (id, data) =>
  fetch(`${BASE_URL}/violations/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then(handleResponse);

export const deleteViolation = (id) =>
  fetch(`${BASE_URL}/violations/${id}`, {
    method: "DELETE",
  }).then(handleResponse);

// ── Ordinances ────────────────────────────────────────────────────────────────
export const getOrdinances = () =>
  fetch(`${BASE_URL}/ordinances`).then(handleResponse);

export const uploadOrdinance = (formData) =>
  fetch(`${BASE_URL}/ordinances`, {
    method: "POST",
    body: formData,
  }).then(handleResponse);

export const deleteOrdinance = (id) =>
  fetch(`${BASE_URL}/ordinances/${id}`, { method: "DELETE" }).then(
    handleResponse,
  );

// ── Users ─────────────────────────────────────────────────────────────────────
const actorHeaders = () => {
  try {
    const raw = localStorage.getItem("sjtmo_user");
    if (!raw) return { "Content-Type": "application/json" };
    const u = JSON.parse(raw);
    return { "Content-Type": "application/json", "X-Actor-Id": u?.id || "" };
  } catch {
    return { "Content-Type": "application/json" };
  }
};

export const getUsers = () =>
  fetch(`${BASE_URL}/users`, { headers: actorHeaders() }).then(handleResponse);

export const createUser = (data) =>
  fetch(`${BASE_URL}/users`, {
    method: "POST",
    headers: actorHeaders(),
    body: JSON.stringify(data),
  }).then(handleResponse);

export const updateUser = (id, data) =>
  fetch(`${BASE_URL}/users/${id}`, {
    method: "PATCH",
    headers: actorHeaders(),
    body: JSON.stringify(data),
  }).then(handleResponse);

export const deleteUser = (id) =>
  fetch(`${BASE_URL}/users/${id}`, {
    method: "DELETE",
    headers: actorHeaders(),
  }).then(handleResponse);

export const resetUserPassword = (id, password) =>
  fetch(`${BASE_URL}/users/${id}/reset-password`, {
    method: "POST",
    headers: actorHeaders(),
    body: JSON.stringify({ password }),
  }).then(handleResponse);

export const forceLogoutUser = (id) =>
  fetch(`${BASE_URL}/users/${id}/force-logout`, {
    method: "POST",
    headers: actorHeaders(),
  }).then(handleResponse);

export const getUserActivity = (id) =>
  fetch(`${BASE_URL}/users/${id}/activity`, {
    headers: actorHeaders(),
  }).then(handleResponse);
