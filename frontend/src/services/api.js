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
  const text = await res.text();
  if (!text) throw new Error("Server returned an empty response");
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Server error (${res.status}): ${text.slice(0, 120)}`);
  }
  if (!res.ok) {
    const msg =
      typeof data.error === "object" ? data.error.message : data.error;
    throw new Error(msg || "Request failed");
  }
  return data;
};

function setToken(token) {
  if (token) localStorage.setItem("sjtmo_token", token);
}

function forceLogout() {
  localStorage.removeItem("sjtmo_user");
  localStorage.removeItem("sjtmo_token");
  window.dispatchEvent(new Event("auth:expired"));
}

// Wraps an authenticated fetch: on 401, tries a silent refresh once and
// retries the original request before giving up and forcing a logout.
async function authedFetch(url, options) {
  let res = await fetch(url, options);
  if (res.status === 401) {
    try {
      const { token } = await refreshToken();
      setToken(token);
      const retryOptions = { ...options, headers: { ...options.headers } };
      if (retryOptions.headers.Authorization) {
        retryOptions.headers.Authorization = `Bearer ${token}`;
      }
      res = await fetch(url, retryOptions);
    } catch {
      forceLogout();
      const err = new Error("Session expired");
      err.status = 401;
      throw err;
    }
  }
  return handleResponse(res);
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const login = (email, password) =>
  fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  }).then(handleResponse);

export const register = (data) =>
  fetch(`${BASE_URL}/login/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  }).then(handleResponse);

export const refreshToken = () =>
  fetch(`${BASE_URL}/login/refresh`, {
    method: "POST",
    credentials: "include",
  }).then(handleResponse);

export const logout = () =>
  fetch(`${BASE_URL}/login/logout`, {
    method: "POST",
    credentials: "include",
  }).then(handleResponse);

// ── Violations ────────────────────────────────────────────────────────────────
export const getViolations = (motoristName = null) => {
  const url = motoristName
    ? `${BASE_URL}/tickets?motorist=${encodeURIComponent(motoristName)}`
    : `${BASE_URL}/tickets`;
  return authedFetch(url, { headers: authHeadersOnly() });
};

export const getEnforcerViolations = (enforcerId) =>
  authedFetch(
    `${BASE_URL}/tickets?enforcer_id=${encodeURIComponent(enforcerId)}`,
    {
      headers: authHeadersOnly(),
    },
  );

// Upserts the motorist and creates the ticket atomically in one request.
export const issueViolation = (data) =>
  authedFetch(`${BASE_URL}/tickets`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });

export const uploadEvidencePhoto = (ticketId, formData) =>
  authedFetch(`${BASE_URL}/tickets/${ticketId}/photo`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData,
  });

export const getEvidencePhotoUrl = (ticketId, accessToken) =>
  `${BASE_URL}/tickets/${ticketId}/photo?token=${encodeURIComponent(accessToken)}`;

export const updateViolationStatus = (id, status) =>
  authedFetch(`${BASE_URL}/tickets/${id}/status`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ status }),
  });

// Public, unauthenticated receipt lookup — used by the QR code on printed receipts.
export const getPublicReceipt = async (token) => {
  const res = await fetch(
    `${BASE_URL}/tickets/lookup/${encodeURIComponent(token)}`,
  );
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
  authedFetch(`${BASE_URL}/tickets/types`, {
    headers: authHeadersOnly(),
  });

export const addViolationType = (name, fine) =>
  authedFetch(`${BASE_URL}/tickets/types`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ name, fine: Number(fine) || 0 }),
  });

export const updateViolationType = (id, name, fine) =>
  authedFetch(`${BASE_URL}/tickets/types/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ name, fine: Number(fine) || 0 }),
  });

export const deleteViolationType = (id) =>
  authedFetch(`${BASE_URL}/tickets/types/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });

export const updateViolation = (id, data) =>
  authedFetch(`${BASE_URL}/tickets/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });

export const deleteViolation = (id) =>
  authedFetch(`${BASE_URL}/tickets/${id}`, {
    method: "DELETE",
    headers: authHeadersOnly(),
  });

// ── Motorists ─────────────────────────────────────────────────────────────────
export const searchMotorists = (q) =>
  authedFetch(`${BASE_URL}/motorists/search?q=${encodeURIComponent(q)}`, {
    headers: authHeadersOnly(),
  });

export const saveMotorist = (data) =>
  authedFetch(`${BASE_URL}/motorists${data.id ? `/${data.id}` : ""}`, {
    method: data.id ? "PUT" : "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });

// ── Vehicles ──────────────────────────────────────────────────────────────────
export const searchVehicles = (q) =>
  authedFetch(`${BASE_URL}/vehicles/search?q=${encodeURIComponent(q)}`, {
    headers: authHeadersOnly(),
  });

export const saveVehicle = (data) =>
  authedFetch(`${BASE_URL}/vehicles${data.id ? `/${data.id}` : ""}`, {
    method: data.id ? "PUT" : "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });

// ── Payments ──────────────────────────────────────────────────────────────────
export const recordPayment = (data) =>
  authedFetch(`${BASE_URL}/payments`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });

export const getPaymentsForViolation = (violationId) =>
  authedFetch(`${BASE_URL}/payments/${violationId}`, {
    headers: authHeadersOnly(),
  });

export const uploadReceiptPhoto = (paymentId, formData) =>
  authedFetch(`${BASE_URL}/payments/${paymentId}/photo`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData,
  });

export const getReceiptPhotoUrl = (paymentId, accessToken) =>
  `${BASE_URL}/payments/${paymentId}/photo?token=${encodeURIComponent(accessToken)}`;

export const submitMotoristReceipt = (formData) =>
  authedFetch(`${BASE_URL}/payments/motorist-submit`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData,
  });

export const verifyPayment = (paymentId) =>
  authedFetch(`${BASE_URL}/payments/${paymentId}/verify`, {
    method: "POST",
    headers: authHeadersOnly(),
  });

export const rejectPayment = (paymentId, reason) =>
  authedFetch(`${BASE_URL}/payments/${paymentId}/reject`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ reason }),
  });

// ── Ordinances ────────────────────────────────────────────────────────────────
export const getOrdinances = () =>
  authedFetch(`${BASE_URL}/ordinances`, {
    headers: authHeadersOnly(),
  });

export const uploadOrdinance = (formData) =>
  authedFetch(`${BASE_URL}/ordinances`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData,
  });

export const deleteOrdinance = (id) =>
  authedFetch(`${BASE_URL}/ordinances/${id}`, {
    method: "DELETE",
    headers: authHeadersOnly(),
  });

// ── Users ─────────────────────────────────────────────────────────────────────
export const getUsers = () =>
  authedFetch(`${BASE_URL}/users`, { headers: authHeadersOnly() });

export const createUser = (data) =>
  authedFetch(`${BASE_URL}/users`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });

export const updateUser = (id, data) =>
  authedFetch(`${BASE_URL}/users/${id}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });

export const deleteUser = (id) =>
  authedFetch(`${BASE_URL}/users/${id}`, {
    method: "DELETE",
    headers: authHeadersOnly(),
  });

export const resetUserPassword = (id, password) =>
  authedFetch(`${BASE_URL}/users/${id}/reset-password`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ password }),
  });

export const forceLogoutUser = (id) =>
  authedFetch(`${BASE_URL}/users/${id}/force-logout`, {
    method: "POST",
    headers: authHeadersOnly(),
  });

export const getUserActivity = (id) =>
  authedFetch(`${BASE_URL}/users/${id}/activity`, {
    headers: authHeadersOnly(),
  });
