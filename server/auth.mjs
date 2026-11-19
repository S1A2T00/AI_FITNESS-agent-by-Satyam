// Firebase authentication (who are you?) and authorization (what may you do?)
// for the API server. Every /api route except the public ones must pass
// through `authenticate`, and admin routes additionally through `requireRole`.
import { readFileSync } from "node:fs";
import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

export const ROLES = Object.freeze(["user", "admin"]);

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

function loadServiceAccount() {
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  if (inline) {
    // Accept raw JSON or base64-encoded JSON (easier to store as a secret).
    const json = inline.startsWith("{")
      ? inline
      : Buffer.from(inline, "base64").toString("utf8");
    return JSON.parse(json);
  }

  const file = process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim();
  if (file) {
    return JSON.parse(readFileSync(file, "utf8"));
  }

  return null;
}

const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
if (!projectId) {
  throw new Error(
    "FIREBASE_PROJECT_ID is missing. Configure .env.local or the container environment."
  );
}

const serviceAccount = loadServiceAccount();

// Token verification only needs the project ID (Google's public keys are
// fetched automatically). Changing roles and listing users needs a service
// account, so admin endpoints are disabled without one.
const app = initializeApp({
  projectId,
  ...(serviceAccount
    ? { credential: cert(serviceAccount) }
    : process.env.GOOGLE_APPLICATION_CREDENTIALS
      ? { credential: applicationDefault() }
      : {}),
});

export const adminAuth = getAuth(app);
export const hasAdminCredentials = Boolean(
  serviceAccount || process.env.GOOGLE_APPLICATION_CREDENTIALS
);

const requireVerifiedEmail =
  (process.env.REQUIRE_EMAIL_VERIFIED || "false").toLowerCase() === "true";

const bootstrapAdmins = new Set(
  (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

/**
 * Verifies the `Authorization: Bearer <Firebase ID token>` header and returns
 * the caller's identity. Throws 401 when missing/invalid, 403 when the
 * account is not allowed to use the app yet.
 */
export async function authenticate(req) {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer (.+)$/);
  if (!match) {
    throw httpError(401, "Sign in to continue.");
  }

  let decoded;
  try {
    // checkRevoked = true so disabled users / revoked sessions are rejected
    // immediately instead of when the 1h token expires. Needs credentials.
    decoded = await adminAuth.verifyIdToken(match[1], hasAdminCredentials);
  } catch {
    throw httpError(401, "Your session has expired. Please sign in again.");
  }

  if (requireVerifiedEmail && decoded.firebase?.sign_in_provider === "password" && !decoded.email_verified) {
    throw httpError(403, "Verify your email address before using Vitalis AI.");
  }

  let role = ROLES.includes(decoded.role) ? decoded.role : "user";

  // Promote configured admin emails on first sight, so the first admin can be
  // created without running a script. Only trusted if the email is verified.
  if (
    role !== "admin" &&
    hasAdminCredentials &&
    decoded.email_verified &&
    bootstrapAdmins.has(String(decoded.email).toLowerCase())
  ) {
    await adminAuth.setCustomUserClaims(decoded.uid, { role: "admin" });
    role = "admin";
  }

  return {
    uid: decoded.uid,
    email: decoded.email || null,
    displayName: decoded.name || null,
    emailVerified: Boolean(decoded.email_verified),
    role,
  };
}

export function requireRole(user, ...allowed) {
  if (!allowed.includes(user.role)) {
    throw httpError(403, "You do not have permission to do that.");
  }
}

export async function listUsers() {
  if (!hasAdminCredentials) {
    throw httpError(501, "Admin features need a Firebase service account on the server.");
  }
  const { users } = await adminAuth.listUsers(1000);
  return users.map((u) => ({
    uid: u.uid,
    email: u.email || null,
    displayName: u.displayName || null,
    disabled: u.disabled,
    role: ROLES.includes(u.customClaims?.role) ? u.customClaims.role : "user",
    createdAt: u.metadata.creationTime,
    lastSignIn: u.metadata.lastSignInTime || null,
  }));
}

export async function setUserRole(actor, body) {
  if (!hasAdminCredentials) {
    throw httpError(501, "Admin features need a Firebase service account on the server.");
  }
  if (typeof body.uid !== "string" || !body.uid || !ROLES.includes(body.role)) {
    throw httpError(400, "Provide a uid and a role of: " + ROLES.join(", ") + ".");
  }
  if (body.uid === actor.uid && body.role !== "admin") {
    throw httpError(400, "You cannot remove your own admin role.");
  }

  const target = await adminAuth.getUser(body.uid).catch(() => {
    throw httpError(404, "User not found.");
  });
  await adminAuth.setCustomUserClaims(target.uid, {
    ...(target.customClaims || {}),
    role: body.role,
  });
  // Force the user's existing tokens to be re-issued with the new role.
  await adminAuth.revokeRefreshTokens(target.uid);

  return { uid: target.uid, role: body.role };
}

/** Public, non-secret web config the browser needs to start Firebase Auth. */
export function webConfig() {
  return {
    apiKey: process.env.FIREBASE_WEB_API_KEY || "",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
    projectId,
    appId: process.env.FIREBASE_APP_ID || "",
  };
}
