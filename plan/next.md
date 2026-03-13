# ghars next queue

This is the short-term execution queue. The canonical longer-horizon status lives in `status.md`.

## Now

1. Verify the final manual production webapp click-through end to end:
   - signed-out user lands on `/`
   - user signs in with GitHub
   - user lands on `/dashboard`
   - user imports starred repos
   - imported dashboard data renders for that user only
   - note: the live backend path is already verified against a real 439-star portfolio
2. Expose scheduled-refresh health and freshness more clearly in the UI:
   - show priority-refresh vs full-refresh timing
   - surface last cron-driven snapshot activity
   - make it obvious when dashboard data is fresh vs stale
3. Backfill README enrichment more visibly across cold portfolios:
   - surface README coverage progress in the dashboard
   - show which repos still lack README context
   - optionally add a manual "enrich now" control for the current repo or portfolio slice
4. Deepen analytics drill-downs beyond the current ranking cards:
   - clickable momentum explanations
   - cluster drill-down from the constellation/analytics surface
   - per-repo historical snapshot inspection from analytics
5. Add true note editing and deletion for existing notes, not just note creation

## Next

1. Improve cluster narratives and constellation depth with real snapshot data
2. Add export surfaces for report snapshots and portfolio summaries
3. Add richer dashboard drill-downs for neglected repos, state buckets, and recent movement
4. Persist and expose cluster artifacts if the live constellation/reporting layer needs durable cluster history

## Later

1. Tighten chart drill-downs and analytics interactions
2. Improve cluster narratives and scoring quality on real imported portfolios
3. Add the constellation view as a deeper live imported-portfolio visualization
