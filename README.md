# ghars

`ghars` is a portfolio observability dashboard for GitHub stars. It helps you see the structure, movement, and meaning of your starred repo universe, then drill into memory, search, and action.

## Stack

- Next.js 16
- Bun
- Convex
- Auth.js with GitHub-only login
- OpenRouter
- GSAP, Lenis, Three.js

## Current status

The repo includes:

- dashboard-first product shell
- demo-mode portfolio data so the app runs before keys are configured
- pure domain services and tests for search, notes, import, analytics, and reports
- Convex schema and adapter scaffolding for production data flows
- Auth.js GitHub-only auth scaffolding with App Router handlers and protected-route proxy
- live GitHub repo and Vercel deployment infrastructure

## Environment

Copy `.env.example` to `.env.local` and fill in values as you enable providers.

Required for production:

- `AUTH_SECRET`
- `AUTH_GITHUB_ID`
- `AUTH_GITHUB_SECRET`
- `NEXT_PUBLIC_CONVEX_URL`
- `CONVEX_DEPLOYMENT`
- `CONVEX_DEPLOY_KEY`
- `OPENROUTER_API_KEY`

Optional during development:

- `GHARS_DEMO_MODE=true`

## Product decisions

- v1 auth is GitHub-only through Auth.js. Email and password flows add friction without helping the core job.
- GitHub import is the primary onboarding path after sign-in.
- BYOK AI should be optional. The default product path should work with a platform-managed AI key, and advanced users can later attach their own OpenRouter key for summaries, embeddings, and heavier personal usage.

## Scripts

- `bun run dev`
- `bun run dev:demo`
- `bun run lint`
- `bun run typecheck`
- `bun run test`
- `bun run test:e2e`
- `bun run convex:codegen`

## Local development

```bash
bun install
cp .env.example .env.local
bun run dev:demo
```

## Product scope

- Portfolio Overview
- Search and triage
- Repo detail with notes and state
- Analytics and reports
- Constellation view

## License

MIT
