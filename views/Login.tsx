import React, { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { FullPageSpinner } from "../components/ProtectedRoute";

type Mode = "signin" | "signup" | "reset";

function friendlyError(e: unknown): string {
  const code = (e as { code?: string })?.code || "";
  const map: Record<string, string> = {
    "auth/invalid-credential": "Incorrect email or password.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/user-disabled": "This account has been disabled.",
    "auth/email-already-in-use": "An account with this email already exists.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/too-many-requests": "Too many attempts. Try again later.",
    "auth/popup-closed-by-user": "Google sign-in was cancelled.",
    "auth/operation-not-allowed": "This sign-in method is not enabled in Firebase.",
    "auth/unauthorized-domain": "This domain is not authorized in Firebase Authentication settings.",
  };
  return map[code] || (e as Error)?.message || "Something went wrong.";
}

export const Login: React.FC = () => {
  const { user, loading, configError, signIn, signUp, signInWithGoogle, resetPassword } = useAuth();
  const location = useLocation();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (loading) return <FullPageSpinner />;
  if (user) {
    const from = (location.state as { from?: string } | null)?.from || "/";
    return <Navigate to={from} replace />;
  }

  const run = async (fn: () => Promise<void>, success?: string) => {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await fn();
      if (success) setInfo(success);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "signin") run(() => signIn(email, password));
    else if (mode === "signup") run(() => signUp(name.trim(), email, password));
    else run(() => resetPassword(email), "Password reset email sent. Check your inbox.");
  };

  const title = { signin: "Welcome back", signup: "Create your account", reset: "Reset password" }[mode];

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white">
            <i className="fas fa-heart-pulse text-xl"></i>
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-800">Vitalis AI</span>
        </div>

        <h1 className="text-2xl font-extrabold text-slate-900">{title}</h1>

        {configError && (
          <p className="mt-4 text-sm bg-amber-50 text-amber-800 border border-amber-100 rounded-xl p-3">{configError}</p>
        )}

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {mode === "signup" && (
            <input
              className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Full name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}
          <input
            className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            type="email"
            placeholder="Email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {mode !== "reset" && (
            <input
              className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              type="password"
              placeholder="Password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              minLength={6}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
          {info && <p className="text-sm text-emerald-700">{info}</p>}

          <button
            type="submit"
            disabled={busy || !!configError}
            className="w-full bg-blue-600 text-white font-semibold rounded-xl py-3 hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? <i className="fas fa-circle-notch fa-spin"></i> : { signin: "Sign in", signup: "Create account", reset: "Send reset link" }[mode]}
          </button>
        </form>

        {mode !== "reset" && (
          <>
            <div className="flex items-center gap-3 my-6 text-xs text-slate-400">
              <div className="flex-grow border-t border-slate-200"></div>OR<div className="flex-grow border-t border-slate-200"></div>
            </div>
            <button
              onClick={() => run(signInWithGoogle)}
              disabled={busy || !!configError}
              className="w-full border border-slate-200 rounded-xl py-3 font-semibold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <i className="fab fa-google"></i> Continue with Google
            </button>
          </>
        )}

        <div className="mt-6 text-sm text-center text-slate-500 space-y-2">
          {mode === "signin" && (
            <>
              <p>
                <button className="text-blue-600 hover:underline" onClick={() => setMode("reset")}>Forgot password?</button>
              </p>
              <p>
                New here? <button className="text-blue-600 hover:underline" onClick={() => setMode("signup")}>Create an account</button>
              </p>
            </>
          )}
          {mode !== "signin" && (
            <p>
              <button className="text-blue-600 hover:underline" onClick={() => setMode("signin")}>Back to sign in</button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
