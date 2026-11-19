import React, { useEffect, useState } from "react";
import { apiFetch } from "../services/geminiService";
import { useAuth, type Role } from "../context/AuthContext";

interface AdminUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  disabled: boolean;
  role: Role;
  createdAt: string;
  lastSignIn: string | null;
  analyses: number;
}

export const AdminPanel: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const load = () =>
    apiFetch<{ users: AdminUser[] }>("/api/admin/users")
      .then((d) => setUsers(d.users))
      .catch((e: Error) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  const changeRole = async (uid: string, role: Role) => {
    setSaving(uid);
    setError(null);
    try {
      await apiFetch("/api/admin/set-role", { body: { uid, role } });
      setUsers((prev) => prev?.map((u) => (u.uid === uid ? { ...u, role } : u)) || null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-extrabold text-slate-900">Admin · Users</h1>
        <p className="text-slate-500 mt-1">Manage who has admin access. Role changes sign the user out of other sessions.</p>
      </header>

      {error && <p className="bg-red-50 border border-red-100 text-red-700 rounded-2xl p-4 text-sm">{error}</p>}

      {!users && !error && <i className="fas fa-circle-notch fa-spin text-2xl text-blue-600"></i>}

      {users && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500 border-b border-slate-100">
              <tr>
                <th className="p-4">User</th>
                <th className="p-4">Last sign-in</th>
                <th className="p-4">Analyses</th>
                <th className="p-4">Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.uid} className="border-b border-slate-50 last:border-0">
                  <td className="p-4">
                    <p className="font-semibold">{u.displayName || "—"}</p>
                    <p className="text-slate-500">{u.email}</p>
                    {u.disabled && <span className="text-xs text-red-600">Disabled</span>}
                  </td>
                  <td className="p-4 text-slate-500">
                    {u.lastSignIn ? new Date(u.lastSignIn).toLocaleString() : "Never"}
                  </td>
                  <td className="p-4 text-slate-500">{u.analyses}</td>
                  <td className="p-4">
                    <select
                      className="border border-slate-200 rounded-lg px-2 py-1"
                      value={u.role}
                      disabled={saving === u.uid || u.uid === user?.uid}
                      onChange={(e) => changeRole(u.uid, e.target.value as Role)}
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
