import React, { useEffect, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { verifyEmail, resendVerification } from "../../services/api";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [status, setStatus] = useState(token ? "verifying" : "missing");
  const [message, setMessage] = useState("");
  const [resendEmail, setResendEmail] = useState("");
  const [resendStatus, setResendStatus] = useState("");
  const ranOnce = useRef(false);

  useEffect(() => {
    if (!token || ranOnce.current) return;
    ranOnce.current = true;
    verifyEmail(token)
      .then((res) => {
        setStatus("success");
        setMessage(res.message || "Email verified. You can now sign in.");
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err.message || "This verification link is invalid or has expired.");
      });
  }, [token]);

  const handleResend = async (e) => {
    e.preventDefault();
    setResendStatus("sending");
    try {
      await resendVerification(resendEmail.trim());
      setResendStatus("If that account exists, a verification email was sent.");
    } catch (err) {
      setResendStatus(err.message || "Something went wrong. Please try again.");
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <h1 className="login-title">SJTMO</h1>
          <p className="login-subtitle">Email Verification</p>
        </div>

        {status === "verifying" && <p>Verifying your email…</p>}

        {status === "success" && (
          <>
            <p>{message}</p>
            <Link className="btn btn-primary btn-full" to="/login" style={{ display: "block", textAlign: "center", marginTop: 12 }}>
              Go to Sign In
            </Link>
          </>
        )}

        {(status === "error" || status === "missing") && (
          <>
            <div className="login-error" role="alert">
              <span>
                {status === "missing"
                  ? "No verification token was provided."
                  : message}
              </span>
            </div>

            <form onSubmit={handleResend} noValidate style={{ marginTop: 16 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="resend_email">
                  Resend verification email
                </label>
                <input
                  id="resend_email"
                  className="form-input"
                  type="email"
                  placeholder="you@example.com"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  required
                />
              </div>
              <button
                className="btn btn-primary btn-full"
                type="submit"
                disabled={resendStatus === "sending"}
              >
                {resendStatus === "sending" ? "Sending…" : "Resend Email"}
              </button>
              {resendStatus && resendStatus !== "sending" && (
                <p className="login-footer">{resendStatus}</p>
              )}
            </form>
          </>
        )}

        <p className="login-footer">
          <Link to="/login">Back to Sign In</Link>
        </p>
      </div>
    </div>
  );
}
