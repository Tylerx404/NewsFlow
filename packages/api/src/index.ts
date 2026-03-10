import { ORPCError, os } from "@orpc/server";

import type { AuthSession, AuthSessionUser, Context } from "./context";

export { resolveUserCountry } from "./modules/discover/country-resolution.service";

export const o = os.$context<Context>();

export const publicProcedure = o;

const SUSPENDED_ACCOUNT_MESSAGE = "Your account is suspended.";

function resolveUserRole(user: AuthSessionUser) {
  return user.role ?? "USER";
}

function resolveUserStatus(user: AuthSessionUser) {
  return user.status ?? "ACTIVE";
}

function requireSession(session: Context["session"]): AuthSession {
  if (!session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }

  return session;
}

function assertActiveUser(user: AuthSessionUser) {
  if (resolveUserStatus(user) === "SUSPENDED") {
    throw new ORPCError("FORBIDDEN", {
      message: SUSPENDED_ACCOUNT_MESSAGE,
    });
  }
}

function assertAdminUser(user: AuthSessionUser) {
  if (resolveUserRole(user) !== "ADMIN") {
    throw new ORPCError("FORBIDDEN", {
      message: "Admin access is required.",
    });
  }
}

const requireAuthenticatedUser = o.middleware(async ({ context, next }) => {
  const session = requireSession(context.session);

  // Suspended users are blocked on all protected procedures so admin suspension takes effect immediately.
  assertActiveUser(session.user);

  return next({
    context: {
      session,
    },
  });
});

const requireAdminUser = o.middleware(async ({ context, next }) => {
  const session = requireSession(context.session);

  assertActiveUser(session.user);
  assertAdminUser(session.user);

  return next({
    context: {
      session,
    },
  });
});

export const protectedProcedure = publicProcedure.use(requireAuthenticatedUser);
export const adminProcedure = publicProcedure.use(requireAdminUser);
