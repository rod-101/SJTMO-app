import React, { useState } from "react";
import { Link } from "react-router-dom";
import { register } from "../../services/api";

const MIN_REGISTRATION_AGE = 16;

function computeAge(birthdayDate) {
  const today = new Date();
  let age = today.getFullYear() - birthdayDate.getFullYear();
  const m = today.getMonth() - birthdayDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthdayDate.getDate())) age--;
  return age;
}

// ─── Icons ───────────────────────────────────────────────────────────────────
const SignalIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ width: 26, height: 26 }}
  >
    <path
      d="M2 12C2 6.48 6.48 2 12 2s10 4.48 10 10-4.48 10-10 10S2 17.52 2 12z"
      opacity="0"
    />
    <path d="M5 12.5a7 7 0 0 1 14 0" />
    <path d="M8.5 15.5a4 4 0 0 1 7 0" />
    <circle cx="12" cy="18.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const EyeIcon = ({ open }) =>
  open ? (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: 18, height: 18 }}
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: 18, height: 18 }}
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [birthday, setBirthday] = useState("");
  const [licenseNo, setLicenseNo] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Enter your full name.");
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!birthday) {
      setError("Enter your birthday.");
      return;
    }
    const birthdayDate = new Date(birthday);
    if (birthdayDate > new Date()) {
      setError("Birthday cannot be in the future.");
      return;
    }
    if (computeAge(birthdayDate) < MIN_REGISTRATION_AGE) {
      setError(
        `You must be at least ${MIN_REGISTRATION_AGE} years old to register.`,
      );
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
        birthday,
        license_no: licenseNo.trim() || undefined,
      });
      setRegistered(true);
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (registered) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-brand">
            <div className="login-brand-icon">
              <SignalIcon />
            </div>
            <h1 className="login-title">SJTMO</h1>
            <p className="login-subtitle">San Jose Traffic Management Office</p>
          </div>
          <p>
            Check your email at <strong>{email.trim()}</strong> to verify your
            account before signing in.
          </p>
          <p className="login-footer">
            <Link to="/login">Back to Sign In</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        {/* ── Brand ── */}
        <div className="login-brand">
          <div className="login-brand-icon">
            <SignalIcon />
          </div>
          <h1 className="login-title">SJTMO</h1>
          <p className="login-subtitle">San Jose Traffic Management Office</p>
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div className="login-error" role="alert">
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              style={{ width: 15, height: 15, flexShrink: 0, marginTop: 1 }}
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-9.25a.75.75 0 011.5 0v3a.75.75 0 01-1.5 0v-3zm.75 5.5a.875.875 0 110-1.75.875.875 0 010 1.75z"
              />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} noValidate>
          {/* Name */}
          <div className="form-group">
            <label className="form-label" htmlFor="name">
              Full Name
            </label>
            <input
              id="name"
              className="form-input"
              type="text"
              placeholder="Juan Dela Cruz"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              required
              autoComplete="name"
              autoFocus
            />
          </div>

          {/* Email */}
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              className="form-input"
              type="email"
              inputMode="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              required
              autoComplete="email"
              spellCheck={false}
            />
          </div>

          {/* Birthday */}
          <div className="form-group">
            <label className="form-label" htmlFor="birthday">
              Birthday
            </label>
            <input
              id="birthday"
              className="form-input"
              type="date"
              value={birthday}
              onChange={(e) => {
                setBirthday(e.target.value);
                setError("");
              }}
              required
              autoComplete="bday"
              max={new Date().toISOString().slice(0, 10)}
            />
          </div>

          {/* License Number (optional) */}
          <div className="form-group">
            <label className="form-label" htmlFor="license_no">
              License Number <span style={{ fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              id="license_no"
              className="form-input"
              type="text"
              placeholder="e.g. N03-18-123456"
              value={licenseNo}
              onChange={(e) => {
                setLicenseNo(e.target.value);
                setError("");
              }}
              autoComplete="off"
            />
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <div className="input-eye-wrapper">
              <input
                id="password"
                className="form-input"
                type={showPwd ? "text" : "password"}
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                className="input-eye-btn"
                onClick={() => setShowPwd((v) => !v)}
                tabIndex={-1}
                aria-label={showPwd ? "Hide password" : "Show password"}
              >
                <EyeIcon open={showPwd} />
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="confirm_password">
              Confirm Password
            </label>
            <div className="input-eye-wrapper">
              <input
                id="confirm_password"
                className="form-input"
                type={showPwd ? "text" : "password"}
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError("");
                }}
                required
                autoComplete="new-password"
              />
            </div>
          </div>

          <button
            className="btn btn-primary btn-full"
            type="submit"
            disabled={loading}
            style={{ marginTop: 8 }}
          >
            {loading ? (
              <span className="btn-loading">
                <span className="spinner" /> Creating account…
              </span>
            ) : (
              "Register"
            )}
          </button>
        </form>

        {/* ── Footer ── */}
        <p className="login-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
