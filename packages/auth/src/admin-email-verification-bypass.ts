import {
  APIError,
  type BetterAuthPlugin,
} from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";

import { isEmailVerificationRequired } from "./email-verification-policy";

export function adminEmailVerificationBypassPlugin(): BetterAuthPlugin {
  return {
    id: "admin-email-verification-bypass",
    hooks: {
      before: [
        {
          matcher(ctx) {
            return ctx.path === "/sign-in/email";
          },
          handler: createAuthMiddleware(async (ctx) => {
            if (!isEmailVerificationRequired()) {
              return;
            }

            const email =
              typeof ctx.body.email === "string" ? ctx.body.email.trim() : "";
            const password =
              typeof ctx.body.password === "string" ? ctx.body.password : "";

            if (!email || !password) {
              return;
            }

            const user = await ctx.context.internalAdapter.findUserByEmail(email, {
              includeAccounts: true,
            });

            if (!user) {
              return;
            }

            const authUser = user.user as typeof user.user & {
              role?: string;
            };

            if (
              authUser.emailVerified
              || authUser.role !== "ADMIN"
            ) {
              return;
            }

            const credentialAccount = user.accounts.find(
              (account) => account.providerId === "credential"
            );

            if (!credentialAccount?.password) {
              return;
            }

            const validPassword = await ctx.context.password.verify({
              hash: credentialAccount.password,
              password,
            });

            if (!validPassword) {
              return;
            }

            const session = await ctx.context.internalAdapter.createSession(
              user.user.id,
              ctx.body.rememberMe === false
            );

            if (!session) {
              throw APIError.from("UNAUTHORIZED", {
                code: "FAILED_TO_CREATE_SESSION",
                message: "Failed to create session",
              });
            }

            await setSessionCookie(
              ctx,
              {
                session,
                user: authUser,
              },
              ctx.body.rememberMe === false
            );

            if (ctx.body.callbackURL) {
              ctx.setHeader("Location", ctx.body.callbackURL);
            }

            return ctx.json({
              redirect: Boolean(ctx.body.callbackURL),
              token: session.token,
              url: ctx.body.callbackURL,
              user: authUser,
            });
          }),
        },
      ],
    },
  };
}
