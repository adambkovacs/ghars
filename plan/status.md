# ghars execution status

This file is the canonical execution tracker. A plan item is only `done` when there is proof in implementation, service tests, or Playwright acceptance coverage.

## Current summary

- Public signed-out production traffic is real and isolated from user portfolio data
- Local demo and test modes still exist for development and acceptance coverage
- Auth gating is real across the app surface
- The dashboard import slice is real
- Search and repo detail now consume imported portfolio data
- Analytics now consumes imported portfolio data
- Reports now render live generated portfolio reviews from imported data
- The authenticated production crash caused by a Convex return-validator mismatch is fixed
- The production runtime has been exercised against a real 439-star portfolio using the live backend path
- Service-layer coverage is ahead of UI integration coverage

## Phase status

| Phase | Status | Notes | Proof |
| --- | --- | --- | --- |
| 0. Repo and design foundation | done | App shell, routes, tests, docs, and environment scaffolding are in place | [Landing page](../app/page.tsx), [app chrome](../components/layout/app-chrome.tsx), [smoke tests](../e2e/smoke.spec.ts) |
| 1. Auth and GitHub import | partial | Production auth secrets are configured, the live sign-in page exposes GitHub login, and the live backend import/runtime path has been verified on a 439-star portfolio; one manual browser import click-through still remains | [Auth config](../auth.ts), [dashboard action](../app/dashboard/actions.ts), [GitHub gateway](../lib/adapters/github/githubApiGateway.ts), [Convex query fix](../convex/portfolio.ts) |
| 2. Notes, states, and search core | partial | Search now uses imported data, but note editing and state mutation are not yet wired into the live UI | [service tests](../tests/unit/services.test.ts), [search service](../lib/services/searchPortfolio.ts), [search UI](../components/search/search-studio.tsx) |
| 3. Dashboard alpha and chart system | partial | Dashboard and analytics are live; note/state editing and historical snapshot depth are still incomplete | [dashboard page](../app/dashboard/page.tsx), [analytics page](../app/analytics/page.tsx), [state ring](../components/charts/state-ring.tsx) |
| 4. Momentum engine and scheduled refresh | partial | Scoring services exist, but live scheduled refresh is not fully integrated into the product UI | [momentum service](../lib/services/computeMomentumScore.ts), [neglect service](../lib/services/generateNeglectSignals.ts), [crons](../convex/crons.ts) |
| 5. AI assist and cluster intelligence | partial | Service-layer narratives and related logic exist; live UI integration is not complete | [cluster narratives](../lib/services/buildClusterNarratives.ts), [report generation](../lib/services/generateReports.ts), [service tests](../tests/unit/services.test.ts) |
| 6. Signature visual layer | partial | Constellation preview exists, but not as a live imported-portfolio surface | [constellation preview](../components/charts/constellation-preview.tsx), [analytics page](../app/analytics/page.tsx) |
| 7. Reporting, polish, and release | partial | Reports page now renders live generated portfolio reviews, but reports are not yet persisted snapshots | [report generation](../lib/services/generateReports.ts), [reports page](../app/reports/page.tsx) |

## Surface tracker

| Surface | Auth gating | Real data integration | Acceptance coverage | Status |
| --- | --- | --- | --- | --- |
| Auth, login, import | yes | yes for dashboard import slice | yes in `E2E_TEST_MODE`; live sign-in page verified | partial |
| Dashboard | yes | yes for imported metrics and recent repos | yes through login-and-import Playwright flow | partial |
| Search | yes | yes | yes through post-import search flow | partial |
| Analytics | yes | yes | yes through post-import analytics flow | partial |
| Reports | yes | yes, live-generated | yes through post-import reports flow | partial |
| Repo detail | yes | yes | yes through search drill-down flow | partial |

## Production auth status

- `AUTH_SECRET` is configured in Vercel
- `AUTH_GITHUB_ID` is configured in Vercel
- `AUTH_GITHUB_SECRET` is configured in Vercel
- `ghars.vercel.app/sign-in` now renders the live `Continue with GitHub` flow
- The live backend import/runtime path now succeeds against a real 439-star portfolio
- A final manual browser click-through of sign-in -> import still remains

## Important evidence notes

- Route access policy is implemented as a pure service and unit-tested: [service](../lib/services/resolveRouteAccess.ts), [tests](../tests/unit/routeAccess.test.ts)
- The dashboard import slice is implemented end to end through session -> action -> import service -> persistence -> dashboard model: [dashboard page](../app/dashboard/page.tsx), [dashboard action](../app/dashboard/actions.ts), [runtime assembly](../lib/server/portfolio/runtime.ts)
- Search and repo detail now read from the shared imported-portfolio runtime instead of the demo dataset: [search page](../app/search/page.tsx), [repo detail page](../app/repo/[owner]/[name]/page.tsx), [runtime assembly](../lib/server/portfolio/runtime.ts), [Playwright flow](../e2e/smoke.spec.ts)
- Analytics and reports now read from the shared imported-portfolio runtime instead of demo data: [analytics page](../app/analytics/page.tsx), [reports page](../app/reports/page.tsx), [runtime assembly](../lib/server/portfolio/runtime.ts), [Playwright flow](../e2e/smoke.spec.ts)
- The production crash fix lives in the Convex repo lookup query, which now serializes return values and normalizes full-name lookups before returning them: [Convex portfolio query](../convex/portfolio.ts)
- Current unit and service tests cover more product behavior than the UI currently exposes with live data
