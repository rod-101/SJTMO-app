import React from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useNavigate } from "react-router-dom";
import "../App.css";

const roleLabels = {
  admin: "🔐 Admin",
  enforcer: "🚓 Enforcer",
  motorist: "🚗 Motorist",
};

export default function Navbar({ title, showMenuToggle, onMenuToggle, hideUser }) {
  const { user, logoutUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutUser();
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        {showMenuToggle && (
          <button className="navbar-menu-btn" onClick={onMenuToggle} aria-label="Toggle menu">
            <span />
            <span />
            <span />
          </button>
        )}
        <span>🚦</span>
        <div
          style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}
        >
          <span style={{ fontWeight: 800, letterSpacing: 1 }}>SJTMO</span>
          <span
            style={{
              fontSize: "0.65rem",
              opacity: 0.7,
              fontWeight: 400,
              letterSpacing: 0.3,
            }}
          >
            {title || "Traffic Management System"}
          </span>
        </div>
      </div>
      <div className="navbar-user">
        {!hideUser && (
          <>
            <span style={{ opacity: 0.8 }}>{user?.name}</span>
            <span
              style={{
                background: "rgba(255,255,255,0.2)",
                padding: "2px 8px",
                borderRadius: 12,
                fontSize: "0.75rem",
              }}
            >
              {roleLabels[user?.role] || user?.role}
            </span>
          </>
        )}
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
        {!hideUser && (
          <button className="btn-logout" onClick={handleLogout}>
            Logout
          </button>
        )}
      </div>
    </nav>
  );
}
