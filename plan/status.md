# ghars execution status

This file is the canonical execution tracker. A plan item is only `done` when there is proof in implementation, service tests, or Playwright acceptance coverage.

## Current summary

- Public signed-out production traffic is real and isolated from user portfolio data
- Local demo and test modes still exist for development and acceptance coverage
- Auth gating is real across the app surface
- The dashboard import slice is real
- Search, analytics, reports, and repo detail are still UI-integrated against demo data
- Service-layer coverage is ahead of UI integration coverage

## Phase status

| Phase | Status | Notes | Proof |
| --- | --- | --- | --- |
| 0. Repo and design foundation | done | App shell, routes, tests, docs, and environment scaffolding are in place | [Landing page](../app/page.tsx), [app chrome](../components/layout/app-chrome.tsx), [smoke tests](../e2e/smoke.spec.ts) |
| 1. Auth and GitHub import | done in code, blocked in production | Auth.js GitHub-only flow and dashboard import slice exist; production OAuth still needs secrets | [Auth config](../auth.ts), [dashboard action](../app/dashboard/actions.ts), [GitHub gateway](../lib/adapters/github/githubApiGateway.ts) |
| 2. Notes, states, and search core | partial | Domain services exist, but search UI still uses demo data | [service tests](../tests/unit/services.test.ts), [search service](../lib/services/searchPortfolio.ts), [search UI](../components/search/search-studio.tsx) |
| 3. Dashboard alpha and chart system | partial | Dashboard import is live; broader analytics surfaces are still demo-backed | [dashboard page](../app/dashboard/page.tsx), [state ring](../components/charts/state-ring.tsx), [animated value](../components/charts/animated-value.tsx) |
| 4. Momentum engine and scheduled refresh | partial | Scoring services exist, but live scheduled refresh is not fully integrated into the product UI | [momentum service](../lib/services/computeMomentumScore.ts), [neglect service](../lib/services/generateNeglectSignals.ts), [crons](../convex/crons.ts) |
| 5. AI assist and cluster intelligence | partial | Service-layer narratives and related logic exist; live UI integration is not complete | [cluster narratives](../lib/services/buildClusterNarratives.ts), [report generation](../lib/services/generateReports.ts), [service tests](../tests/unit/services.test.ts) |
| 6. Signature visual layer | partial | Constellation preview exists, but not as a live imported-portfolio surface | [constellation preview](../components/charts/constellation-preview.tsx), [analytics page](../app/analytics/page.tsx) |
| 7. Reporting, polish, and release | partial | Report generation services exist; reports page still renders demo snapshots | [report generation](../lib/services/generateReports.ts), [reports page](../app/reports/page.tsx) |

## Surface tracker

| Surface | Auth gating | Real data integration | Acceptance coverage | Status |
| --- | --- | --- | --- | --- |
| Auth, login, import | yes | yes for dashboard import slice | yes in `E2E_TEST_MODE` | partial production blocker |
| Dashboard | yes | yes for imported metrics and recent repos | yes through login-and-import Playwright flow | partial |
| Search | yes | no, still demo-backed | no dedicated acceptance flow | partial |
| Analytics | yes | no, still demo-backed | no dedicated acceptance flow | partial |
| Reports | yes | no, still demo-backed | no dedicated acceptance flow | partial |
| Repo detail | yes | no, still demo-backed | no dedicated acceptance flow | partial |

## Production blockers

- Missing `AUTH_SECRET`
- Missing `AUTH_GITHUB_ID`
- Missing `AUTH_GITHUB_SECRET`
- Because of those missing secrets, real GitHub OAuth is not yet enabled in production even though the flow is implemented

## Important evidence notes

- Route access policy is implemented as a pure service and unit-tested: [service](../lib/services/resolveRouteAccess.ts), [tests](../tests/unit/routeAccess.test.ts)
- The dashboard import slice is implemented end to end through session -> action -> import service -> persistence -> dashboard model: [dashboard page](../app/dashboard/page.tsx), [dashboard action](../app/dashboard/actions.ts), [runtime assembly](../lib/server/portfolio/runtime.ts)
- Current unit and service tests cover more product behavior than the UI currently exposes with live data
