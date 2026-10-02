import { jwtVerify, SignJWT } from "jose";
import { appSecret } from "./secret";

// Sin dependencias de next/headers para poder usarse también desde proxy.ts.

export const SESSION_COOKIE = "kipu_session";
export const SESSION_DAYS = 30;

const key = () => new TextEncoder().encode(appSecret());

export async function signSession(userId: number): Promise<string> {
  return new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(key());
}

export async function verifySession(token: string | undefined): Promise<number | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    return typeof payload.uid === "number" ? payload.uid : null;
  } catch {
    return null;
  }
}
