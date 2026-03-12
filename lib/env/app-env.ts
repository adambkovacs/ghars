import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_CONVEX_URL: z.string().url().optional(),
  CONVEX_DEPLOYMENT: z.string().optional(),
  CONVEX_DEPLOY_KEY: z.string().optional(),
  AUTH_SECRET: z.string().optional(),
  AUTH_GITHUB_ID: z.string().optional(),
  AUTH_GITHUB_SECRET: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_TEXT_MODEL: z.string().default("openai/gpt-4.1-mini"),
  OPENROUTER_EMBED_MODEL: z.string().default("openai/text-embedding-3-small"),
  GHARS_DEMO_MODE: z
    .string()
    .optional()
    .transform((value) => value === "true"),
  E2E_TEST_MODE: z
    .string()
    .optional()
    .transform((value) => value === "true"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const rawEnv = {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
  CONVEX_DEPLOYMENT: process.env.CONVEX_DEPLOYMENT,
  CONVEX_DEPLOY_KEY: process.env.CONVEX_DEPLOY_KEY,
  AUTH_SECRET: process.env.AUTH_SECRET,
  AUTH_GITHUB_ID: process.env.AUTH_GITHUB_ID,
  AUTH_GITHUB_SECRET: process.env.AUTH_GITHUB_SECRET,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  OPENROUTER_TEXT_MODEL: process.env.OPENROUTER_TEXT_MODEL,
  OPENROUTER_EMBED_MODEL: process.env.OPENROUTER_EMBED_MODEL,
  GHARS_DEMO_MODE: process.env.GHARS_DEMO_MODE,
  E2E_TEST_MODE: process.env.E2E_TEST_MODE,
  NODE_ENV: process.env.NODE_ENV,
};

const parsedEnv = envSchema.parse(rawEnv);

export const appEnv = {
  ...parsedEnv,
  appUrl: parsedEnv.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  isDemoMode:
    parsedEnv.GHARS_DEMO_MODE ||
    parsedEnv.E2E_TEST_MODE ||
    !parsedEnv.CONVEX_DEPLOYMENT ||
    !parsedEnv.NEXT_PUBLIC_CONVEX_URL,
  isConvexConfigured: Boolean(parsedEnv.CONVEX_DEPLOYMENT) && Boolean(parsedEnv.NEXT_PUBLIC_CONVEX_URL),
  isGitHubAuthConfigured:
    Boolean(parsedEnv.AUTH_SECRET) &&
    Boolean(parsedEnv.AUTH_GITHUB_ID) &&
    Boolean(parsedEnv.AUTH_GITHUB_SECRET),
  isAiConfigured: Boolean(parsedEnv.OPENROUTER_API_KEY),
};

export type AppEnv = typeof appEnv;
