// lib/session.ts
// MVP-only: simple user identity without cookies/auth.
// You can swap this later for real session logic.

export function requireUserId(): string {
  // Use DEV_USER_ID from .env if set; otherwise fall back to a stable demo id.
  return process.env.DEV_USER_ID || "demo-user";
}

export function getUserId(): string | null {
  return process.env.DEV_USER_ID || "demo-user";
}
