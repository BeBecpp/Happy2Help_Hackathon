import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { serverConfig } from "./config";

export const SESSION_COOKIE = "h2h_session";
const MAX_AGE_SECONDS = 60 * 60 * 10; // one school day

/** What the BFF keeps server-side about the signed-in person. Never contains plugin data. */
export type Session =
  | {
      mode: "gateway";
      kind: "staff";
      /** erxes team-member JWT from the gateway `login` mutation. */
      token: string;
      issuedAt: number;
    }
  | {
      mode: "gateway";
      kind: "student";
      /** erxes Client Portal user token (`client-auth-token`). */
      token: string;
      issuedAt: number;
    }
  | {
      mode: "dev-direct";
      kind: "staff" | "student";
      /** Fictional demo persona key (see api/src/seed/demo.ts). */
      personaKey: string;
      principalId: string;
      email: string;
      issuedAt: number;
    };

const b64url = (buf: Buffer) => buf.toString("base64url");

function sign(payload: string) {
  return b64url(createHmac("sha256", serverConfig.sessionSecret).update(payload).digest());
}

export function encodeSession(session: Session): string {
  const payload = b64url(Buffer.from(JSON.stringify(session), "utf8"));
  return `${payload}.${sign(payload)}`;
}

export function decodeSession(value: string | undefined): Session | null {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Session;
    if (Date.now() - session.issuedAt > MAX_AGE_SECONDS * 1000) return null;
    if (session.mode !== serverConfig.mode) return null;
    return session;
  } catch {
    return null;
  }
}

export async function readSession(): Promise<Session | null> {
  const store = await cookies();
  return decodeSession(store.get(SESSION_COOKIE)?.value);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  };
}
