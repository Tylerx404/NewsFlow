import { config } from "dotenv";

config();
config({
  path: new URL("../../server/.env", import.meta.url).pathname,
  override: false,
});

const { env } = await import("@NewsFlow/env/server");
const { startJobRunner } = await import("@NewsFlow/queue");

console.log(`Worker is starting in ${env.NODE_ENV} mode`);
startJobRunner();
