# ghars

`ghars` is a portfolio observability dashboard for GitHub stars. It helps you see the structure, movement, and meaning of your starred repo universe, then drill into memory, search, and action.

## Canonical plan

The product definition and execution status now live under `plan/`.

- [PRD](plan/prd.md)
- [Execution status](plan/status.md)
- [Next work queue](plan/next.md)

## Stack

- Next.js 16
- Bun
- Convex
- Auth.js with GitHub-only login
- OpenRouter
- GSAP, Lenis, Three.js

## Current implementation snapshot

The repo includes:

- public landing page plus protected app surfaces
- Auth.js GitHub-only auth scaffolding with App Router handlers and protected-route proxy
- Convex schema and production function scaffolding
- a real dashboard import slice driven by the signed-in session and the import service
- live imported search and repo detail surfaces
- live imported analytics and live generated reports surfaces
- pure domain services and tests that are broader than the current UI integration
- Playwright coverage for signed-out routing plus a test-mode login, import, search, repo drill-down, analytics, and reports flow
- live GitHub repo, Vercel project, and Convex deployment infrastructure

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

## Verification

- `bun run test` covers the pure service layer, including route access policy and portfolio services
- `bun run test:e2e` covers the public landing, protected-route redirects, `/login` aliasing, and a full sign-in plus import flow in `E2E_TEST_MODE`
- Real GitHub OAuth is now configured in Vercel production; the remaining step is a full live user-authenticated import verification

## Product decisions

- v1 auth is GitHub-only through Auth.js. Email and password flows add friction without helping the core job.
- GitHub login and GitHub authorization are the same user flow in v1.
- GitHub import is the primary onboarding path after sign-in.
- `/plan` is the canonical source of truth for scope and progress.

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

## License

MIT
