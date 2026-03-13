# ghars next queue

This is the short-term execution queue. The canonical longer-horizon status lives in `status.md`.

## Now

1. Enable real GitHub OAuth in production by setting `AUTH_SECRET`, `AUTH_GITHUB_ID`, and `AUTH_GITHUB_SECRET`
2. Verify the true webapp flow end to end:
   - signed-out user lands on `/`
   - user signs in with GitHub
   - user lands on `/dashboard`
   - user imports starred repos
   - imported dashboard data renders for that user only
3. Replace the demo-backed search surface with live user portfolio data
4. Add Playwright acceptance coverage for post-import search and drill-down

## Next

1. Replace demo-backed repo detail with live imported data, notes, and state
2. Replace demo-backed analytics with live imported portfolio metrics and snapshots
3. Replace demo-backed reports with live generated report snapshots
4. Extend scheduled refresh integration so momentum and neglect data stay current in live views

## Later

1. Tighten chart drill-downs and analytics interactions
2. Improve cluster narratives and scoring quality on real imported portfolios
3. Add the constellation view as a live imported-portfolio visualization instead of a demo preview
