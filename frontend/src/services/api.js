const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const handleResponse = async (res) => {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};

export const login = (email, password) =>
  fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  }).then(handleResponse);

export const getViolations = (motoristName = null) => {
  const url = motoristName
    ? `${BASE_URL}/violations?motorist=${encodeURIComponent(motoristName)}`
    : `${BASE_URL}/violations`;
  return fetch(url).then(handleResponse);
};

export const createViolation = (data) =>
  fetch(`${BASE_URL}/violations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(handleResponse);

export const updateViolationStatus = (id, status) =>
  fetch(`${BASE_URL}/violations/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  }).then(handleResponse);

export const getViolationTypes = () =>
  fetch(`${BASE_URL}/violations/types`).then(handleResponse);

export const addViolationType = (name) =>
  fetch(`${BASE_URL}/violations/types`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  }).then(handleResponse);

export const updateViolation = (id, data) =>
  fetch(`${BASE_URL}/violations/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(handleResponse);

export const getOrdinances = () =>
  fetch(`${BASE_URL}/ordinances`).then(handleResponse);

export const uploadOrdinance = (formData) =>
  fetch(`${BASE_URL}/ordinances`, {
    method: 'POST',
    body: formData, // multipart/form-data — don't set Content-Type manually
  }).then(handleResponse);

export const deleteOrdinance = (id) =>
  fetch(`${BASE_URL}/ordinances/${id}`, { method: 'DELETE' }).then(handleResponse);

export const getUsers = () =>
  fetch(`${BASE_URL}/users`).then(handleResponse);

export const createUser = (data) =>
  fetch(`${BASE_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(handleResponse);

export const deleteUser = (id) =>
  fetch(`${BASE_URL}/users/${id}`, { method: 'DELETE' }).then(handleResponse);
