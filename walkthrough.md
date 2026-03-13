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
- Repo detail now supports live note creation and live state mutation against imported portfolio data.
- Analytics now reads from the imported portfolio runtime and stored snapshot history.
- Reports now render persisted portfolio review snapshots generated from imported data.
- Convex now runs scheduled priority and full portfolio refresh jobs through internal GitHub refresh actions.
- The authenticated production crash path was fixed in Convex by serializing repo query results instead of returning raw documents that violate strict return validators.
- The live production runtime has been exercised against a real 439-star portfolio and now builds dashboard, search, analytics, and report models successfully.
- Service-layer coverage is currently broader than the live UI integration.

## Follow-up

- Keep v1 auth GitHub-only through Auth.js. That matches the product better than mixed auth methods because every meaningful user action depends on GitHub data.
- GitHub login and GitHub authorization remain the same flow in v1. There is no separate GitHub-app authorization step.
- Add true note editing and deletion for existing notes, plus deeper analytics drill-downs
- Production GitHub OAuth credentials are configured; the remaining auth step is one last manual browser import verification after the Convex and cron refresh fixes
- Tune scoring and cluster narratives with real data
- Treat `/plan` as the canonical planning location going forward
