import React from "react";

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: "⊞" },
  { key: "issue", label: "Issue", icon: "✍️" },
  { key: "history", label: "My Issued", icon: "📋" },
  { key: "profile", label: "Profile", icon: "👤" },
];

export default function EnforcerBottomNav({ active, onChange }) {
  return (
    <nav className="enf-bottom-nav">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.key}
          className={`enf-nav-btn${active === item.key ? " enf-nav-active" : ""}`}
          onClick={() => onChange(item.key)}
          aria-label={item.label}
        >
          <span className="enf-nav-icon">{item.icon}</span>
          <span className="enf-nav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
