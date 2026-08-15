import React, { createContext, useContext, useState, useEffect } from "react";
import { logout as apiLogout } from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("sjtmo_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const loginUser = (userData, token) => {
    setUser(userData);
    localStorage.setItem("sjtmo_user", JSON.stringify(userData));
    if (token) localStorage.setItem("sjtmo_token", token);
  };

  const logoutUser = () => {
    apiLogout().catch(() => {});
    setUser(null);
    localStorage.removeItem("sjtmo_user");
    localStorage.removeItem("sjtmo_token");
  };

  return (
    <AuthContext.Provider value={{ user, loginUser, logoutUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
