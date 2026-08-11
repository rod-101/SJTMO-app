const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function getToken() {
  return localStorage.getItem("sjtmo_token") || "";
}

function authHeaders(extra = {}) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
    ...extra,
  };
}

function authHeadersOnly() {
  return { Authorization: `Bearer ${getToken()}` };
}

const handleResponse = async (res) => {
  if (res.status === 401) {
    localStorage.removeItem("sjtmo_user");
    localStorage.removeItem("sjtmo_token");
    window.location.href = "/login";
    return;
  }
  const text = await res.text();
  if (!text) throw new Error("Server returned an empty response");
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Server error (${res.status}): ${text.slice(0, 120)}`);
  }
  if (!res.ok) {
    const msg = typeof data.error === "object" ? data.error.message : data.error;
    throw new Error(msg || "Request failed");
  }
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
    ? `${BASE_URL}/tickets?motorist=${encodeURIComponent(motoristName)}`
    : `${BASE_URL}/tickets`;
  return fetch(url, { headers: authHeadersOnly() }).then(handleResponse);
};

export const getEnforcerViolations = (enforcerId) =>
  fetch(`${BASE_URL}/tickets?enforcer_id=${encodeURIComponent(enforcerId)}`, {
    headers: authHeadersOnly(),
  }).then(handleResponse);

// Upserts the motorist and creates the ticket atomically in one request.
export const issueViolation = (data) =>
  fetch(`${BASE_URL}/tickets`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  }).then(handleResponse);

export const uploadEvidencePhoto = (ticketId, formData) =>
  fetch(`${BASE_URL}/tickets/${ticketId}/photo`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData,
  }).then(handleResponse);

export const getEvidencePhotoUrl = (ticketId, accessToken) =>
  `${BASE_URL}/tickets/${ticketId}/photo?token=${encodeURIComponent(accessToken)}`;

export const updateViolationStatus = (id, status) =>
  fetch(`${BASE_URL}/tickets/${id}/status`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ status }),
  }).then(handleResponse);

// Public, unauthenticated receipt lookup — used by the QR code on printed receipts.
export const getPublicReceipt = async (token) => {
  const res = await fetch(`${BASE_URL}/tickets/lookup/${encodeURIComponent(token)}`);
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Server error (${res.status})`);
  }
  if (!res.ok) throw new Error(data.error || "Ticket not found");
  return data;
};

export const getViolationTypes = () =>
  fetch(`${BASE_URL}/tickets/types`, {
    headers: authHeadersOnly(),
  }).then(handleResponse);

export const addViolationType = (name, fine) =>
  fetch(`${BASE_URL}/tickets/types`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ name, fine: Number(fine) || 0 }),
  }).then(handleResponse);

export const updateViolation = (id, data) =>
  fetch(`${BASE_URL}/tickets/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data),
  }).then(handleResponse);

export const deleteViolation = (id) =>
  fetch(`${BASE_URL}/tickets/${id}`, {
    method: "DELETE",
    headers: authHeadersOnly(),
  }).then(handleResponse);

// ── Motorists ─────────────────────────────────────────────────────────────────
export const searchMotorists = (q) =>
  fetch(`${BASE_URL}/motorists/search?q=${encodeURIComponent(q)}`, {
    headers: authHeadersOnly(),
  }).then(handleResponse);

export const saveMotorist = (data) =>
  fetch(`${BASE_URL}/motorists${data.id ? `/${data.id}` : ""}`, {
    method: data.id ? "PUT" : "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  }).then(handleResponse);

// ── Vehicles ──────────────────────────────────────────────────────────────────
export const searchVehicles = (q) =>
  fetch(`${BASE_URL}/vehicles/search?q=${encodeURIComponent(q)}`, {
    headers: authHeadersOnly(),
  }).then(handleResponse);

export const saveVehicle = (data) =>
  fetch(`${BASE_URL}/vehicles${data.id ? `/${data.id}` : ""}`, {
    method: data.id ? "PUT" : "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  }).then(handleResponse);

// ── Payments ──────────────────────────────────────────────────────────────────
export const recordPayment = (data) =>
  fetch(`${BASE_URL}/payments`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  }).then(handleResponse);

export const getPaymentsForViolation = (violationId) =>
  fetch(`${BASE_URL}/payments/${violationId}`, {
    headers: authHeadersOnly(),
  }).then(handleResponse);

// ── Ordinances ────────────────────────────────────────────────────────────────
export const getOrdinances = () =>
  fetch(`${BASE_URL}/ordinances`, {
    headers: authHeadersOnly(),
  }).then(handleResponse);

export const uploadOrdinance = (formData) =>
  fetch(`${BASE_URL}/ordinances`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData,
  }).then(handleResponse);

export const deleteOrdinance = (id) =>
  fetch(`${BASE_URL}/ordinances/${id}`, {
    method: "DELETE",
    headers: authHeadersOnly(),
  }).then(handleResponse);

// ── Users ─────────────────────────────────────────────────────────────────────
export const getUsers = () =>
  fetch(`${BASE_URL}/users`, { headers: authHeadersOnly() }).then(handleResponse);

export const createUser = (data) =>
  fetch(`${BASE_URL}/users`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  }).then(handleResponse);

export const updateUser = (id, data) =>
  fetch(`${BASE_URL}/users/${id}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(data),
  }).then(handleResponse);

export const deleteUser = (id) =>
  fetch(`${BASE_URL}/users/${id}`, {
    method: "DELETE",
    headers: authHeadersOnly(),
  }).then(handleResponse);

export const resetUserPassword = (id, password) =>
  fetch(`${BASE_URL}/users/${id}/reset-password`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ password }),
  }).then(handleResponse);

export const forceLogoutUser = (id) =>
  fetch(`${BASE_URL}/users/${id}/force-logout`, {
    method: "POST",
    headers: authHeadersOnly(),
  }).then(handleResponse);

export const getUserActivity = (id) =>
  fetch(`${BASE_URL}/users/${id}/activity`, {
    headers: authHeadersOnly(),
  }).then(handleResponse);
