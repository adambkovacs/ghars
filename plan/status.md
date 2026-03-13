# ghars execution status

This file is the canonical execution tracker. A plan item is only `done` when there is proof in implementation, service tests, or Playwright acceptance coverage.

## Current summary

- Public signed-out production traffic is real and isolated from user portfolio data
- Local demo and test modes still exist for development and acceptance coverage
- Auth gating is real across the app surface
- The dashboard import slice is real
- Search and repo detail now consume imported portfolio data
- Repo detail supports live note creation and live state mutation against imported data
- Analytics now consumes imported portfolio data and stored repo snapshots
- Reports now render persisted report snapshots generated from imported portfolio data
- The authenticated production crash caused by a Convex return-validator mismatch is fixed
- The production runtime has been exercised against a real 439-star portfolio using the live backend path
- Scheduled refresh is now wired through Convex cron jobs for full and priority portfolio refreshes
- Service-layer coverage is ahead of UI integration coverage

## Phase status

| Phase | Status | Notes | Proof |
| --- | --- | --- | --- |
| 0. Repo and design foundation | done | App shell, routes, tests, docs, and environment scaffolding are in place | [Landing page](../app/page.tsx), [app chrome](../components/layout/app-chrome.tsx), [smoke tests](../e2e/smoke.spec.ts) |
| 1. Auth and GitHub import | partial | Production auth secrets are configured, GitHub-only login is live, and the live backend import/runtime path has been verified on a 439-star portfolio; one full manual production import click-through still remains | [Auth config](../auth.ts), [dashboard action](../app/dashboard/actions.ts), [GitHub gateway](../lib/adapters/github/githubApiGateway.ts), [Convex query fix](../convex/portfolio.ts) |
| 2. Notes, states, and search core | done | Search uses imported data, repo detail supports live note creation and state mutation, and acceptance coverage exercises add-note, change-state, and search recall | [repo actions](../app/repo/[owner]/[name]/actions.ts), [repo note form](../components/repo/repo-note-form.tsx), [repo state form](../components/repo/repo-state-form.tsx), [Playwright flow](../e2e/smoke.spec.ts), [service tests](../tests/unit/services.test.ts) |
| 3. Dashboard alpha and chart system | partial | Dashboard and analytics are live on imported data with stored snapshot trends, but drill-down depth and broader analytics interactions are still incomplete | [dashboard page](../app/dashboard/page.tsx), [analytics page](../app/analytics/page.tsx), [sparkline](../components/charts/sparkline.tsx) |
| 4. Momentum engine and scheduled refresh | partial | Scoring services are live and Convex cron jobs now run full daily and priority 4-hour refreshes, but the UI does not yet expose cron health or refresh telemetry | [momentum service](../lib/services/computeMomentumScore.ts), [neglect service](../lib/services/generateNeglectSignals.ts), [artifact builder](../lib/server/portfolio/artifacts.ts), [GitHub cron action](../convex/github.ts), [crons](../convex/crons.ts) |
| 5. AI assist and cluster intelligence | partial | Service-layer narratives and related logic exist; live UI integration is not complete | [cluster narratives](../lib/services/buildClusterNarratives.ts), [report generation](../lib/services/generateReports.ts), [service tests](../tests/unit/services.test.ts) |
| 6. Signature visual layer | partial | The constellation preview is live on imported analytics data, but the deeper standalone interactive visualization and drill-down surface are still missing | [constellation preview](../components/charts/constellation-preview.tsx), [analytics page](../app/analytics/page.tsx) |
| 7. Reporting, polish, and release | partial | Reports are now persisted snapshots backed by the shared artifact pipeline, but export surfaces, richer drill-downs, and final polish remain | [artifact builder](../lib/server/portfolio/artifacts.ts), [Convex reports store](../convex/reports.ts), [reports page](../app/reports/page.tsx) |

## Surface tracker

| Surface | Auth gating | Real data integration | Acceptance coverage | Status |
| --- | --- | --- | --- | --- |
| Auth, login, import | yes | yes for dashboard import slice | yes in `E2E_TEST_MODE`; live sign-in page verified | partial |
| Dashboard | yes | yes for imported metrics and recent repos | yes through login-and-import Playwright flow | partial |
| Search | yes | yes | yes through post-import search flow | done |
| Analytics | yes | yes with stored snapshot history | yes through post-import analytics flow | partial |
| Reports | yes | yes with persisted snapshots | yes through post-import reports flow | partial |
| Repo detail | yes | yes with live note/state mutation | yes through search drill-down flow | done |

## Production auth status

- `AUTH_SECRET` is configured in Vercel
- `AUTH_GITHUB_ID` is configured in Vercel
- `AUTH_GITHUB_SECRET` is configured in Vercel
- `ghars.vercel.app/sign-in` now renders the live `Continue with GitHub` flow
- The live backend import/runtime path now succeeds against a real 439-star portfolio
- A final manual browser click-through of sign-in -> import on production still remains

## Important evidence notes

- Route access policy is implemented as a pure service and unit-tested: [service](../lib/services/resolveRouteAccess.ts), [tests](../tests/unit/routeAccess.test.ts)
- The dashboard import slice is implemented end to end through session -> action -> import service -> persistence -> dashboard model: [dashboard page](../app/dashboard/page.tsx), [dashboard action](../app/dashboard/actions.ts), [runtime assembly](../lib/server/portfolio/runtime.ts)
- Search and repo detail now read from the shared imported-portfolio runtime instead of the demo dataset: [search page](../app/search/page.tsx), [repo detail page](../app/repo/[owner]/[name]/page.tsx), [runtime assembly](../lib/server/portfolio/runtime.ts), [Playwright flow](../e2e/smoke.spec.ts)
- Repo detail now supports live note creation and state mutation via server actions and runtime services: [repo actions](../app/repo/[owner]/[name]/actions.ts), [repo note form](../components/repo/repo-note-form.tsx), [repo state form](../components/repo/repo-state-form.tsx), [runtime assembly](../lib/server/portfolio/runtime.ts), [Playwright flow](../e2e/smoke.spec.ts)
- Analytics and reports now read from the shared imported-portfolio runtime instead of demo data, with snapshots and reports persisted through the shared artifact builder: [analytics page](../app/analytics/page.tsx), [reports page](../app/reports/page.tsx), [artifact builder](../lib/server/portfolio/artifacts.ts), [runtime assembly](../lib/server/portfolio/runtime.ts), [Playwright flow](../e2e/smoke.spec.ts)
- Scheduled refresh is now wired through Convex internal actions and cron schedules, while keeping user-specific neglect out of global snapshot rows: [Convex GitHub refresh action](../convex/github.ts), [Convex cron schedule](../convex/crons.ts), [artifact builder](../lib/server/portfolio/artifacts.ts)
- The production crash fix lives in the Convex repo lookup query, which now serializes return values and normalizes full-name lookups before returning them: [Convex portfolio query](../convex/portfolio.ts)
- Current unit and service tests cover more product behavior than the UI currently exposes with live data
