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
      <header className="fade-up">
        <h1 className="text-[28px] font-semibold tracking-tight">Users &amp; roles</h1>
        <p className="text-stone-500 mt-1">Manage who has admin access. Role changes sign the user out of other sessions.</p>
      </header>

      {error && <p className="rounded-xl bg-red-50 text-red-700 ring-1 ring-red-600/15 p-4 text-sm">{error}</p>}

      {!users && !error && <i className="fas fa-circle-notch fa-spin text-xl text-stone-400"></i>}

      {users && (
        <div className="card overflow-x-auto fade-up">
          <table className="w-full text-sm">
            <thead className="text-left text-xs font-medium text-stone-500 border-b border-line">
              <tr>
                <th className="p-4">User</th>
                <th className="p-4">Last sign-in</th>
                <th className="p-4">Analyses</th>
                <th className="p-4">Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.uid} className="border-b border-line last:border-0">
                  <td className="p-4">
                    <p className="font-medium">{u.displayName || "—"}</p>
                    <p className="text-stone-500">{u.email}</p>
                    {u.disabled && <span className="pill pill-critical mt-1">Disabled</span>}
                  </td>
                  <td className="p-4 text-stone-500 tnum">
                    {u.lastSignIn ? new Date(u.lastSignIn).toLocaleString() : "Never"}
                  </td>
                  <td className="p-4 text-stone-500 tnum">{u.analyses}</td>
                  <td className="p-4">
                    <select
                      className="input !h-9 !w-auto text-sm"
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
