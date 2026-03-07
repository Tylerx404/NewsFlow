import type { Request } from "express";

import { auth } from "@NewsFlow/auth";
import { fromNodeHeaders } from "better-auth/node";

interface CreateContextOptions {
  req: Request;
}

type SessionResult = Awaited<ReturnType<typeof auth.api.getSession>>;

export type AuthSession = NonNullable<SessionResult>;
export type AuthSessionUser = AuthSession["user"];

export async function createContext(opts: CreateContextOptions) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(opts.req.headers),
  });
  return {
    session,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
