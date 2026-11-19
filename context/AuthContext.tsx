import React, { createContext, useContext, useEffect, useState } from "react";
import {
  onIdTokenChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import { getFirebaseAuth } from "../services/firebase";
import { apiFetch } from "../services/geminiService";

export type Role = "user" | "admin";

interface AuthState {
  user: User | null;
  role: Role;
  loading: boolean;
  configError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>("user");
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe = () => {};
    getFirebaseAuth()
      .then((auth) => {
        unsubscribe = onIdTokenChanged(auth, async (u) => {
          setUser(u);
          if (!u) {
            setRole("user");
            setLoading(false);
            return;
          }
          // The server is the source of truth for the role (it may promote
          // ADMIN_EMAILS on first sign-in). The UI only uses it to show/hide
          // things; the API enforces it on every request.
          try {
            const me = await apiFetch<{ role: Role }>("/api/me");
            const token = await u.getIdTokenResult();
            if ((token.claims.role || "user") !== me.role) {
              await u.getIdToken(true); // pick up the new claim
            }
            setRole(me.role);
          } catch {
            setRole("user");
          }
          setLoading(false);
        });
      })
      .catch((e: Error) => {
        setConfigError(e.message);
        setLoading(false);
      });
    return () => unsubscribe();
  }, []);

  const value: AuthState = {
    user,
    role,
    loading,
    configError,
    async signIn(email, password) {
      await signInWithEmailAndPassword(await getFirebaseAuth(), email, password);
    },
    async signUp(name, email, password) {
      const cred = await createUserWithEmailAndPassword(await getFirebaseAuth(), email, password);
      if (name) await updateProfile(cred.user, { displayName: name });
      await sendEmailVerification(cred.user).catch(() => {});
    },
    async signInWithGoogle() {
      await signInWithPopup(await getFirebaseAuth(), new GoogleAuthProvider());
    },
    async resetPassword(email) {
      await sendPasswordResetEmail(await getFirebaseAuth(), email);
    },
    async signOut() {
      await fbSignOut(await getFirebaseAuth());
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
