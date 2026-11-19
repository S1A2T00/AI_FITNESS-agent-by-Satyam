import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth, type Role } from "../context/AuthContext";

export const FullPageSpinner: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <i className="fas fa-circle-notch fa-spin text-3xl text-blue-600"></i>
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
      <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
        <i className="fas fa-lock text-3xl text-slate-300 mb-4"></i>
        <h2 className="text-xl font-bold">Access denied</h2>
        <p className="text-slate-500 mt-1">You do not have permission to view this page.</p>
      </div>
    );
  }
  return <>{children}</>;
};
