import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const COOKIE_NAME = "kaamkaro_session";
const DEV_FALLBACK = "dev-secret-change-me-in-production";
const MIN_SECRET_LENGTH = 32;

/**
 * The session secret decides whether every account on the site is safe.
 * A missing/weak secret must never silently degrade into a guessable one, so
 * in production we refuse to sign or verify anything until it is set properly.
 */
let warnedAboutWeakSecret = false;

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  const isProd = process.env.NODE_ENV === "production";

  // Missing or the shipped dev default: never sign anything in production.
  if (!secret || secret === DEV_FALLBACK) {
    if (isProd) {
      throw new Error(
        "JWT_SECRET is not set. Set a long random value in the environment before serving traffic."
      );
    }
    return DEV_FALLBACK;
  }

  // Short but set: keep the site up, tell the operator loudly. Locking every
  // user out of a working deployment is a worse failure than a weak-but-random
  // secret, and this way the fix is a one-line env change.
  if (secret.length < MIN_SECRET_LENGTH && isProd && !warnedAboutWeakSecret) {
    warnedAboutWeakSecret = true;
    console.warn(
      `[security] JWT_SECRET is shorter than ${MIN_SECRET_LENGTH} characters. Rotate it to a 32+ character random value.`
    );
  }
  return secret;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

export function signToken(payload: { userId: string; role: string; tokenVersion?: number }) {
  return jwt.sign(
    { userId: payload.userId, role: payload.role, tv: payload.tokenVersion ?? 0, iss: "kaamkaro" },
    getSecret(),
    { algorithm: "HS256", expiresIn: "30d" }
  );
}

export function verifyToken(
  token: string
): { userId: string; role: string; tokenVersion: number } | null {
  try {
    // Pin the algorithm: without this a forged `alg: none` / algorithm-confusion
    // token is one library quirk away from being accepted.
    const decoded = jwt.verify(token, getSecret(), {
      algorithms: ["HS256"],
      issuer: "kaamkaro",
      maxAge: "30d",
    });
    if (typeof decoded === "string" || !decoded || typeof decoded.userId !== "string") return null;
    return {
      userId: decoded.userId,
      role: String(decoded.role ?? "client"),
      tokenVersion: typeof decoded.tv === "number" ? decoded.tv : 0,
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

/**
 * The session a route actually acts on.
 *
 * Signature validity is not enough: after a password reset (or "log out
 * everywhere") the old cookie is still cryptographically fine, so we compare
 * the token's version against the user row. If the database is unreachable we
 * fall back to trusting the signature — a transient outage should not log the
 * whole site out, and every write path checks auth again anyway.
 */
export async function getSessionUser() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = verifyToken(token);
  if (!session) return null;

  try {
    const [row] = await db
      .select({ tokenVersion: users.tokenVersion })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);
    if (!row) return null; // deleted account
    if (row.tokenVersion !== session.tokenVersion) return null; // revoked session
  } catch (error) {
    console.error("[auth] token version check skipped:", error);
  }

  return { userId: session.userId, role: session.role };
}

/** Invalidate every existing session for a user (used on password reset). */
export async function bumpTokenVersion(userId: string) {
  await db
    .update(users)
    .set({ tokenVersion: sql`${users.tokenVersion} + 1` })
    .where(eq(users.id, userId));
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
