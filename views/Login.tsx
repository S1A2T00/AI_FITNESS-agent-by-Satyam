import React, { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { FullPageSpinner } from "../components/ProtectedRoute";
import { Sculpture } from "../components/Three3D";
import { Logo } from "../components/Logo";

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

  const title = { signin: "Sign in to Vitalis", signup: "Create your account", reset: "Reset your password" }[mode];
  const subtitle = {
    signin: "Welcome back. Pick up where you left off.",
    signup: "Understand your lab results, posture and medication in plain language.",
    reset: "Enter your email and we'll send you a reset link.",
  }[mode];

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      {/* Form */}
      <section className="flex flex-col px-6 py-8 sm:px-12 lg:px-16">
        <Logo />

        <div className="flex-1 flex items-center">
          <div className="w-full max-w-sm mx-auto lg:mx-0 py-12 fade-up">
            <h1 className="text-[28px] leading-tight font-semibold tracking-tight">{title}</h1>
            <p className="text-stone-500 mt-2 text-[15px]">{subtitle}</p>

            {configError && (
              <p className="mt-6 text-sm rounded-xl bg-amber-50 text-amber-800 ring-1 ring-amber-600/20 p-3">{configError}</p>
            )}

            {mode !== "reset" && (
              <>
                <button onClick={() => run(signInWithGoogle)} disabled={busy || !!configError} className="btn btn-secondary w-full mt-8 !h-11">
                  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z" />
                    <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24z" />
                    <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.7V6.6h-4a12 12 0 0 0 0 10.8l4-3z" />
                    <path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.5 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
                  </svg>
                  Continue with Google
                </button>
                <div className="flex items-center gap-3 my-6 text-xs text-stone-400">
                  <div className="flex-grow h-px bg-stone-200" />or<div className="flex-grow h-px bg-stone-200" />
                </div>
              </>
            )}

            <form onSubmit={onSubmit} className={`space-y-4 ${mode === "reset" ? "mt-8" : ""}`}>
              {mode === "signup" && (
                <label className="block">
                  <span className="text-sm font-medium text-stone-700">Full name</span>
                  <input className="input mt-1.5" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
                </label>
              )}
              <label className="block">
                <span className="text-sm font-medium text-stone-700">Email</span>
                <input className="input mt-1.5" type="email" autoComplete="email" placeholder="you@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
              {mode !== "reset" && (
                <label className="block">
                  <span className="flex items-center justify-between text-sm font-medium text-stone-700">
                    Password
                    {mode === "signin" && (
                      <button type="button" className="text-stone-500 hover:text-stone-900 font-normal" onClick={() => setMode("reset")}>Forgot?</button>
                    )}
                  </span>
                  <input
                    className="input mt-1.5"
                    type="password"
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    minLength={6}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </label>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}
              {info && <p className="text-sm text-brand-700">{info}</p>}

              <button type="submit" disabled={busy || !!configError} className="btn btn-primary w-full !h-11">
                {busy ? <i className="fas fa-circle-notch fa-spin" /> : { signin: "Sign in", signup: "Create account", reset: "Send reset link" }[mode]}
              </button>
            </form>

            <p className="mt-8 text-sm text-stone-500">
              {mode === "signin" ? (
                <>No account? <button className="text-stone-900 font-medium underline underline-offset-4 decoration-stone-300 hover:decoration-stone-900" onClick={() => setMode("signup")}>Create one</button></>
              ) : (
                <>Already have an account? <button className="text-stone-900 font-medium underline underline-offset-4 decoration-stone-300 hover:decoration-stone-900" onClick={() => setMode("signin")}>Sign in</button></>
              )}
            </p>
          </div>
        </div>

        <p className="text-xs text-stone-400">Vitalis gives AI insights, not medical diagnoses.</p>
      </section>

      {/* Visual */}
      <section className="hidden lg:block p-3">
        <div className="relative h-full rounded-[28px] overflow-hidden bg-gradient-to-b from-[#EEF6F1] to-[#E3EFE8]">
          <Sculpture className="absolute inset-x-0 top-0 bottom-28" zoom={7.5} />
          <div className="absolute left-10 right-10 bottom-10 flex items-end justify-between gap-8">
            <p className="max-w-xs text-[22px] leading-snug font-medium tracking-tight text-stone-800">
              Your lab reports, posture and prescriptions, explained clearly.
            </p>
            <div className="card px-4 py-3 shadow-lift text-sm">
              <p className="text-stone-500 text-xs">LDL cholesterol</p>
              <p className="mt-0.5 font-semibold tnum">142 mg/dL <span className="pill pill-warning ml-1"><span className="dot" />Above range</span></p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
