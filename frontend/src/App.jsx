import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";

import LandingPage from "./pages/landing/LandingPage";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import VerifyEmail from "./pages/auth/VerifyEmail";
import AcceptInvite from "./pages/auth/AcceptInvite";
import AdminDashboard from "./pages/admin/AdminDashboard";
import EnforcerDashboard from "./pages/enforcer/EnforcerDashboard";
import MotoristDashboard from "./pages/motorist/MotoristDashboard";
import PublicReceipt from "./pages/PublicReceipt";

const ProtectedRoute = ({ children, role }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/login" replace />;
  return children;
};

// Listens for the "auth:expired" event dispatched by api.js on a 401 response
// and navigates to /login client-side, so the browser never issues a full-page
// GET /login that Vite would proxy straight to the backend (which has no such route).
const AuthExpiredListener = () => {
  const { logoutUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthExpired = () => {
      logoutUser();
      navigate("/login", { replace: true });
    };
    window.addEventListener("auth:expired", handleAuthExpired);
    return () => window.removeEventListener("auth:expired", handleAuthExpired);
  }, [logoutUser, navigate]);

  return null;
};

// Show landing page for guests; redirect authenticated users to their dashboard.
const HomeRoute = () => {
  const { user } = useAuth();
  if (!user) return <LandingPage />;
  if (user.role === "admin") return <Navigate to="/admin" replace />;
  if (user.role === "enforcer") return <Navigate to="/enforcer" replace />;
  if (user.role === "motorist") return <Navigate to="/motorist" replace />;
  return <Navigate to="/login" replace />;
};

function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <BrowserRouter>
        <AuthExpiredListener />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/accept-invite" element={<AcceptInvite />} />
          <Route path="/" element={<HomeRoute />} />
          <Route path="/receipt/:token" element={<PublicReceipt />} />
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/enforcer/*"
            element={
              <ProtectedRoute role="enforcer">
                <EnforcerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/motorist/*"
            element={
              <ProtectedRoute role="motorist">
                <MotoristDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
