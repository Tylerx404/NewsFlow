import { config } from "dotenv";
import { fileURLToPath } from "node:url";

config({
  path: fileURLToPath(new URL("../../server/.env", import.meta.url)),
  override: false,
});


const { env } = await import("@NewsFlow/env/server");
const { startJobRunner } = await import("@NewsFlow/queue");

console.log(`Worker is starting in ${env.NODE_ENV} mode`);

startJobRunner();


