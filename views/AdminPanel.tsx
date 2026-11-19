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
      <header className="rise">
        <p className="eyebrow">Admin</p>
        <h1 className="font-display text-4xl font-extrabold mt-2">Users &amp; roles<span className="text-plasma">.</span></h1>
        <p className="text-mist-500 mt-2">Manage who has admin access. Role changes sign the user out of other sessions.</p>
      </header>

      {error && <p className="border border-coral/30 bg-coral/10 text-coral rounded-2xl p-4 text-sm">{error}</p>}

      {!users && !error && <i className="fas fa-circle-notch fa-spin text-2xl text-vital"></i>}

      {users && (
        <div className="panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left eyebrow border-b border-white/[0.06]">
              <tr>
                <th className="p-4">User</th>
                <th className="p-4">Last sign-in</th>
                <th className="p-4">Analyses</th>
                <th className="p-4">Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.uid} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">
                  <td className="p-4">
                    <p className="font-semibold">{u.displayName || "—"}</p>
                    <p className="text-mist-500">{u.email}</p>
                    {u.disabled && <span className="font-mono text-[10px] text-coral">Disabled</span>}
                  </td>
                  <td className="p-4 text-mist-500 font-mono text-xs">
                    {u.lastSignIn ? new Date(u.lastSignIn).toLocaleString() : "Never"}
                  </td>
                  <td className="p-4 text-mist-500 font-mono text-xs">{u.analyses}</td>
                  <td className="p-4">
                    <select
                      className="field !w-auto !py-1.5 !px-3 text-sm"
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
