import React, { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { FullPageSpinner } from "../components/ProtectedRoute";
import { DnaHelix } from "../components/Three3D";

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
  const subtitle = {
    signin: "Sign in to your health intelligence.",
    signup: "Start tracking reports, posture and medication with AI.",
    reset: "We'll email you a link to set a new password.",
  }[mode];

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr]">
      {/* Left: brand + 3D helix */}
      <section className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden">
        <div className="flex items-center gap-3 rise">
          <Logo />
          <span className="font-display text-xl font-bold tracking-tight">Vitalis<span className="text-vital">.</span>AI</span>
        </div>

        <DnaHelix className="absolute inset-y-0 right-0 w-3/4" />

        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-ink-950 via-ink-950/80 to-transparent pointer-events-none" />
        <div className="relative max-w-md rise rise-2">
          <p className="eyebrow mb-4">Holistic health intelligence</p>
          <h1 className="font-display text-5xl xl:text-6xl font-extrabold leading-[1.02]">
            Read your body<br />like <span className="text-vital glow-text">data.</span>
          </h1>
          <p className="mt-5 text-mist-300 text-lg leading-relaxed">
            Lab reports, posture scans and prescriptions, decoded by AI into plain-language insight.
          </p>
          <div className="mt-8 flex gap-6 font-mono text-xs text-mist-500">
            <span><span className="dot dot-normal mr-2" />Lab reports</span>
            <span><span className="dot dot-warning mr-2" />Posture</span>
            <span><span className="dot dot-critical mr-2" />Medication</span>
          </div>
        </div>
      </section>

      {/* Right: auth card */}
      <section className="relative flex flex-col items-center justify-center p-5 sm:p-10">
        <div className="lg:hidden w-full max-w-md h-48 sm:h-56 -mb-6">
          <DnaHelix className="h-full" />
        </div>

        <div className="relative w-full max-w-md panel p-7 sm:p-9 rise rise-1">
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <Logo />
            <span className="font-display text-lg font-bold">Vitalis<span className="text-vital">.</span>AI</span>
          </div>

          <p className="eyebrow">{mode === "signup" ? "New account" : mode === "reset" ? "Recovery" : "Secure sign-in"}</p>
          <h2 className="font-display text-3xl font-bold mt-2">{title}</h2>
          <p className="text-mist-500 mt-1 text-sm">{subtitle}</p>

          {configError && (
            <p className="mt-5 text-sm bg-amberx/10 text-amberx border border-amberx/25 rounded-xl p-3">{configError}</p>
          )}

          <form onSubmit={onSubmit} className="mt-7 space-y-3.5">
            {mode === "signup" && (
              <input className="field" placeholder="Full name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
            )}
            <input className="field" type="email" placeholder="Email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            {mode !== "reset" && (
              <input
                className="field"
                type="password"
                placeholder="Password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                minLength={6}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}

            {error && <p className="text-sm text-coral flex items-center gap-2"><i className="fas fa-circle-exclamation" />{error}</p>}
            {info && <p className="text-sm text-vital flex items-center gap-2"><i className="fas fa-circle-check" />{info}</p>}

            <button type="submit" disabled={busy || !!configError} className="btn-vital w-full !py-3.5">
              {busy ? <i className="fas fa-circle-notch fa-spin" /> : { signin: "Sign in", signup: "Create account", reset: "Send reset link" }[mode]}
              {!busy && <i className="fas fa-arrow-right text-sm" />}
            </button>
          </form>

          {mode !== "reset" && (
            <>
              <div className="flex items-center gap-3 my-6 eyebrow !text-mist-700">
                <div className="flex-grow h-px bg-mist-700/40" />or<div className="flex-grow h-px bg-mist-700/40" />
              </div>
              <button onClick={() => run(signInWithGoogle)} disabled={busy || !!configError} className="btn-ghost w-full disabled:opacity-40">
                <i className="fab fa-google" /> Continue with Google
              </button>
            </>
          )}

          <div className="mt-7 text-sm text-center text-mist-500 space-y-2">
            {mode === "signin" && (
              <>
                <p><button className="text-mist-300 hover:text-vital transition-colors" onClick={() => setMode("reset")}>Forgot password?</button></p>
                <p>New here? <button className="text-vital hover:underline underline-offset-4" onClick={() => setMode("signup")}>Create an account</button></p>
              </>
            )}
            {mode !== "signin" && (
              <p><button className="text-vital hover:underline underline-offset-4" onClick={() => setMode("signin")}>← Back to sign in</button></p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export const Logo: React.FC<{ size?: number }> = ({ size = 40 }) => (
  <div
    className="relative rounded-xl flex items-center justify-center text-ink-950 shrink-0"
    style={{ width: size, height: size, background: "linear-gradient(140deg,#8AF7CF,#22D497)", boxShadow: "0 0 24px rgba(79,240,180,.45)" }}
  >
    <i className="fas fa-heart-pulse" style={{ fontSize: size * 0.45 }} />
  </div>
);
