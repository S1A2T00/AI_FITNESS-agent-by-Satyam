// Usage: node --env-file=.env scripts/set-role.mjs <email> <user|admin>
// Grants or removes the admin role via a Firebase custom claim.
import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const [email, role] = process.argv.slice(2);
if (!email || !["user", "admin"].includes(role)) {
  console.error("Usage: node --env-file=.env scripts/set-role.mjs <email> <user|admin>");
  process.exit(1);
}

const raw =
  process.env.FIREBASE_SERVICE_ACCOUNT?.trim() ||
  (process.env.FIREBASE_SERVICE_ACCOUNT_PATH &&
    readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, "utf8"));
if (!raw) {
  console.error("Set FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_PATH.");
  process.exit(1);
}
const account = JSON.parse(raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8"));

const auth = getAuth(initializeApp({ credential: cert(account) }));
const user = await auth.getUserByEmail(email);
await auth.setCustomUserClaims(user.uid, { ...(user.customClaims || {}), role });
await auth.revokeRefreshTokens(user.uid);
console.log(`${email} is now "${role}". They need to sign in again.`);
