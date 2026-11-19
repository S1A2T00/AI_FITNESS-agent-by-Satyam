import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth, type Role } from "../context/AuthContext";

export const FullPageSpinner: React.FC = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-4">
    <div className="w-12 h-12 rounded-full border-2 border-vital/20 border-t-vital animate-spin" />
    <p className="eyebrow">Loading vitals</p>
  </div>
);

/** Renders children only for signed-in users (optionally with one of `roles`). */
export const ProtectedRoute: React.FC<{ children: React.ReactNode; roles?: Role[] }> = ({
  children,
  roles,
}) => {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles && !roles.includes(role)) {
    return (
      <div className="panel p-12 text-center">
        <i className="fas fa-lock text-3xl text-mist-700 mb-4"></i>
        <h2 className="text-xl font-bold">Access denied</h2>
        <p className="text-mist-500 mt-1">You do not have permission to view this page.</p>
      </div>
    );
  }
  return <>{children}</>;
};
