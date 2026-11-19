import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth, type Role } from "../context/AuthContext";

export const FullPageSpinner: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="w-6 h-6 rounded-full border-2 border-stone-200 border-t-stone-900 animate-spin" aria-label="Loading" />
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
      <div className="card p-12 text-center">
        <i className="fas fa-lock text-2xl text-stone-300 mb-4"></i>
        <h2 className="text-lg font-semibold">Access denied</h2>
        <p className="text-stone-500 mt-1 text-sm">You don't have permission to view this page.</p>
      </div>
    );
  }
  return <>{children}</>;
};
