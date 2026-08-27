import React, { useEffect, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { getInviteInfo, acceptInvite } from "../../services/api";

const ROLE_LABEL = { admin: "an admin", enforcer: "an enforcer" };

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [status, setStatus] = useState(token ? "loading" : "missing");
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const ranOnce = useRef(false);

  useEffect(() => {
    if (!token || ranOnce.current) return;
    ranOnce.current = true;
    getInviteInfo(token)
      .then((data) => {
        setInvite(data);
        setStatus("form");
      })
      .catch((err) => {
        setStatus("error");
        setError(err.message || "This invite link is invalid or has expired.");
      });
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    setSubmitting(true);
    try {
      await acceptInvite(token, password);
      setStatus("success");
    } catch (err) {
      setError(err.message || "This invite link is invalid or has expired.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <h1 className="login-title">SJTMO</h1>
          <p className="login-subtitle">Accept Invite</p>
        </div>

        {status === "loading" && <p>Loading invite…</p>}

        {status === "form" && invite && (
          <>
            <p>
              You've been invited to join SJTMO as {ROLE_LABEL[invite.role] || invite.role}
              {" — "}
              <strong>{invite.email}</strong>. Set a password to activate your account.
            </p>
            {error && (
              <div className="login-error" role="alert">
                <span>{error}</span>
              </div>
            )}
            <form onSubmit={submit} noValidate style={{ marginTop: 16 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="password">
                  New Password
                </label>
                <input
                  id="password"
                  className="form-input"
                  type="password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="confirm">
                  Confirm Password
                </label>
                <input
                  id="confirm"
                  className="form-input"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </div>
              <button className="btn btn-primary btn-full" type="submit" disabled={submitting}>
                {submitting ? "Activating…" : "Activate Account"}
              </button>
            </form>
          </>
        )}

        {status === "success" && (
          <>
            <p>Account activated. You can now sign in.</p>
            <Link
              className="btn btn-primary btn-full"
              to="/login"
              style={{ display: "block", textAlign: "center", marginTop: 12 }}
            >
              Go to Sign In
            </Link>
          </>
        )}

        {(status === "error" || status === "missing") && (
          <div className="login-error" role="alert">
            <span>
              {status === "missing" ? "No invite token was provided." : error}
              {" "}Contact an administrator for a new invite.
            </span>
          </div>
        )}

        <p className="login-footer">
          <Link to="/login">Back to Sign In</Link>
        </p>
      </div>
    </div>
  );
}
