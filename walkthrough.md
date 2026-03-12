# walkthrough

## Goal

Build `ghars` as a dashboard-first GitHub stars observability product with memory, analytics, and momentum.

## Current implementation shape

- Demo-mode experience works without provider keys.
- Production adapters are scaffolded for Auth.js, Convex, GitHub, and OpenRouter.
- Core domain logic is separated from UI and storage.
- GitHub repo and Vercel project are live, but the app still needs real GitHub import wiring.
- Convex production schema and functions are deployed.
- Signed-out users now see a public landing page, not the demo dashboard shell.
- Protected app routes redirect anonymous traffic to `/sign-in`, and `/login` now resolves to that flow too.
- Route access policy now lives in a pure service and is covered by unit tests.
- The dashboard now has a real signed-in import slice: session token -> import service -> persistence -> live dashboard cards.
- Playwright now exercises a full login-and-import flow under `E2E_TEST_MODE` using a deterministic test provider and in-memory runtime.

## Follow-up

- Keep v1 auth GitHub-only through Auth.js. That matches the product better than mixed auth methods because every meaningful user action depends on GitHub data.
- Extend live portfolio data to search, analytics, repo detail, and reports
- Add real GitHub OAuth credentials in production so the import slice can run against the actual GitHub API
- Decide how BYOK AI works. Recommendation: keep platform-managed AI as the default and add user-supplied OpenRouter keys as an optional advanced setting after the core import and dashboard loop are working.
- Tune scoring and cluster narratives with real data
