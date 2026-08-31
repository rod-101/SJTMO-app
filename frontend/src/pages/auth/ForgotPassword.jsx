import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { forgotPassword } from "../../services/api";

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

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Enter your email address.");
      return;
    }

    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setSubmitted(true);
    } catch (err) {
      setError(err.message || "Failed to send reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-brand">
            <div className="login-brand-icon">
              <SignalIcon />
            </div>
            <h1 className="login-title">SJTMO</h1>
            <p className="login-subtitle">Password Reset</p>
          </div>

          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div
              style={{
                fontSize: 48,
                marginBottom: 16,
                color: "var(--color-success, #10b981)",
              }}
            >
              ✓
            </div>
            <h2 style={{ marginBottom: 8 }}>Check your email</h2>
            <p style={{ color: "var(--color-text-secondary, #666)" }}>
              We sent a password reset link to <strong>{email}</strong>. The link expires in 1 hour.
            </p>
          </div>

          <div style={{ marginBottom: 24, padding: 16, backgroundColor: "var(--color-bg-secondary, #f5f5f5)", borderRadius: 8 }}>
            <p style={{ fontSize: 14, margin: "0 0 8px 0" }}>
              <strong>Didn&apos;t receive it?</strong>
            </p>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14 }}>
              <li>Check your spam folder</li>
              <li>Make sure the email is correct</li>
              <li>Try requesting a new link</li>
            </ul>
          </div>

          <button
            onClick={() => setSubmitted(false)}
            className="btn btn-full"
            style={{ marginBottom: 8 }}
          >
            Try another email
          </button>

          <p className="login-footer">
            <Link to="/login">Back to login</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-brand-icon">
            <SignalIcon />
          </div>
          <h1 className="login-title">SJTMO</h1>
          <p className="login-subtitle">Reset your password</p>
        </div>

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

        <p
          style={{
            color: "var(--color-text-secondary, #666)",
            marginBottom: 24,
            fontSize: 14,
          }}
        >
          Enter your email address and we&apos;ll send you a link to reset your password.
        </p>

        <form onSubmit={handleSubmit} noValidate>
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

          <button
            className="btn btn-primary btn-full"
            type="submit"
            disabled={loading}
            style={{ marginTop: 8 }}
          >
            {loading ? (
              <span className="btn-loading">
                <span className="spinner" /> Sending…
              </span>
            ) : (
              "Send reset link"
            )}
          </button>
        </form>

        <p className="login-footer">
          <Link to="/login">Back to login</Link>
        </p>
        <p className="login-footer">
          San Jose, Occidental Mindoro &mdash; Traffic Management System
        </p>
      </div>
    </div>
  );
}
