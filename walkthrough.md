# walkthrough

## Goal

Build `ghars` as a dashboard-first GitHub stars observability product with memory, analytics, and momentum.

## Current implementation shape

- Signed-out production traffic sees a public landing page and no user portfolio data.
- Local demo and test modes still exist so the app can run before provider keys are configured.
- Production adapters are scaffolded for Auth.js, Convex, GitHub, and OpenRouter.
- Core domain logic is separated from UI and storage.
- GitHub repo, Vercel project, and Convex deployment are live.
- Convex production schema and functions are deployed.
- Signed-out users now see a public landing page, not the demo dashboard shell.
- Protected app routes redirect anonymous traffic to `/sign-in`, and `/login` now resolves to that flow too.
- Route access policy now lives in a pure service and is covered by unit tests.
- The dashboard now has a real signed-in import slice: session token -> import service -> persistence -> live dashboard cards.
- Playwright now exercises a full login-and-import flow under `E2E_TEST_MODE` using a deterministic test provider and in-memory runtime.
- Search and repo detail now read from the imported portfolio runtime.
- Analytics and reports still render demo-backed UI data.
- Service-layer coverage is currently broader than the live UI integration.

## Follow-up

- Keep v1 auth GitHub-only through Auth.js. That matches the product better than mixed auth methods because every meaningful user action depends on GitHub data.
- GitHub login and GitHub authorization remain the same flow in v1. There is no separate GitHub-app authorization step.
- Extend live portfolio data to analytics and reports, then deepen note and state editing on repo detail
- Production GitHub OAuth credentials are configured; the remaining auth step is verifying a full live user login and import
- Tune scoring and cluster narratives with real data
- Treat `/plan` as the canonical planning location going forward
