import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

import LandingPage from "./pages/landing/LandingPage";
import Login from "./pages/auth/Login";
import AdminDashboard from "./pages/admin/AdminDashboard";
import EnforcerDashboard from "./pages/enforcer/EnforcerDashboard";
import MotoristDashboard from "./pages/motorist/MotoristDashboard";

const ProtectedRoute = ({ children, role }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/login" replace />;
  return children;
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
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<HomeRoute />} />
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
  );
}

export default App;
