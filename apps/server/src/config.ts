import { z } from "zod";

const envSchema = z.object({
  BAYKUS_MODE: z.enum(["single", "multi"]).default("single"),
  BAYKUS_DATA_DIR: z.string().default("./data"),
  BAYKUS_PASSWORD: z.string().optional(),
  BAYKUS_TMDB_API_KEY: z.string().optional(),
  BAYKUS_ENABLE_SCRAPERS: z.enum(["0", "1"]).default("0"),
  /** Multi mode only — single mode generates+persists its own keypair on first boot. */
  BAYKUS_VAPID_PUBLIC_KEY: z.string().optional(),
  BAYKUS_VAPID_PRIVATE_KEY: z.string().optional(),
  PORT: z.coerce.number().int().default(4004),
});

export type Config = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return envSchema.parse(env);
}
