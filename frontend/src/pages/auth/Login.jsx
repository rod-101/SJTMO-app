import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { login, resendVerification } from "../../services/api";

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

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendStatus, setResendStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setNeedsVerification(false);
    setResendStatus("");

    if (!email.trim()) {
      setError("Enter your email address.");
      return;
    }

    setLoading(true);
    try {
      const { user, token } = await login(email.trim(), password);
      loginUser(user, token);
      if (user.role === "admin") navigate("/admin");
      else if (user.role === "enforcer") navigate("/enforcer");
      else navigate("/motorist");
    } catch (err) {
      setError(err.message || "Login failed. Please check your credentials.");
      if (err.code === "EMAIL_NOT_VERIFIED") setNeedsVerification(true);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendStatus("sending");
    try {
      await resendVerification(email.trim());
      setResendStatus("If that account exists, a verification email was sent.");
    } catch (err) {
      setResendStatus(err.message || "Something went wrong. Please try again.");
    }
  };

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

        {needsVerification && (
          <div style={{ marginBottom: 16 }}>
            <button
              type="button"
              className="btn btn-full"
              onClick={handleResend}
              disabled={resendStatus === "sending"}
            >
              {resendStatus === "sending" ? "Sending…" : "Resend verification email"}
            </button>
            {resendStatus && resendStatus !== "sending" && (
              <p className="login-footer">{resendStatus}</p>
            )}
          </div>
        )}

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} noValidate>
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
              autoFocus
              spellCheck={false}
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
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                required
                autoComplete="current-password"
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

          <button
            className="btn btn-primary btn-full"
            type="submit"
            disabled={loading}
            style={{ marginTop: 8 }}
          >
            {loading ? (
              <span className="btn-loading">
                <span className="spinner" /> Signing in…
              </span>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* ── Links ── */}
        <p className="login-footer" style={{ marginTop: 12, textAlign: "center" }}>
          <Link to="/forgot-password">Forgot password?</Link>
        </p>

        {/* ── Footer ── */}
        <p className="login-footer">
          Don&apos;t have an account? <Link to="/register">Register</Link>
        </p>
        <p className="login-footer">
          San Jose, Occidental Mindoro &mdash; Traffic Management System
        </p>
      </div>
    </div>
  );
}
