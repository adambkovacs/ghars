# ghars next queue

This is the short-term execution queue. The canonical longer-horizon status lives in `status.md`.

## Now

1. Verify the true production webapp flow end to end:
   - signed-out user lands on `/`
   - user signs in with GitHub
   - user lands on `/dashboard`
   - user imports starred repos
   - imported dashboard data renders for that user only
2. Tighten the authenticated app chrome so signed-in users do not see generic sign-in CTAs
3. Add live note and state editing to repo detail and search-driven workflows
4. Wire snapshot-backed momentum history so analytics and reports stop relying on recency-only heat

## Next

1. Extend scheduled refresh integration so momentum and neglect data stay current in live views
2. Persist generated reports as actual report snapshots instead of on-read generation
3. Add dedicated analytics drill-down interactions beyond the current imported ranking cards
4. Improve cluster narratives and constellation depth with real snapshot data

## Later

1. Tighten chart drill-downs and analytics interactions
2. Improve cluster narratives and scoring quality on real imported portfolios
3. Add the constellation view as a deeper live imported-portfolio visualization
