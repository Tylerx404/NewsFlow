import { env } from "@NewsFlow/env/server";

export function isEmailVerificationRequired() {
  return env.NODE_ENV === "production";
}

