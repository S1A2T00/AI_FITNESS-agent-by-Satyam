import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

// The web config is not secret, but it is served by the API at runtime so the
// same Docker image works for any Firebase project without a rebuild.
let authPromise: Promise<Auth> | null = null;

export function getFirebaseAuth(): Promise<Auth> {
  if (!authPromise) {
    authPromise = (async () => {
      const res = await fetch("/api/auth-config");
      if (!res.ok) throw new Error("Could not load sign-in configuration.");
      const config = await res.json();
      if (!config.apiKey || !config.projectId) {
        throw new Error("Firebase is not configured on the server.");
      }
      const app: FirebaseApp = initializeApp(config);
      return getAuth(app);
    })();
    authPromise.catch(() => {
      authPromise = null; // allow a retry after a failed load
    });
  }
  return authPromise;
}

/** Current user's ID token, refreshed automatically by the SDK when needed. */
export async function getIdToken(forceRefresh = false): Promise<string | null> {
  const auth = await getFirebaseAuth();
  return auth.currentUser ? auth.currentUser.getIdToken(forceRefresh) : null;
}
