# ghars next queue

This is the short-term execution queue. The canonical longer-horizon status lives in `status.md`.

## Now

1. Verify the true production webapp flow end to end:
   - signed-out user lands on `/`
   - user signs in with GitHub
   - user lands on `/dashboard`
   - user imports starred repos
   - imported dashboard data renders for that user only
2. Replace the demo-backed analytics surface with live imported portfolio metrics and snapshots
3. Replace the demo-backed reports surface with live generated report snapshots
4. Deploy those live analytics and reports slices after acceptance coverage lands

## Next

1. Extend repo detail so notes and state changes can be edited from the live UI
2. Extend scheduled refresh integration so momentum and neglect data stay current in live views
3. Add dedicated acceptance coverage for analytics and reports once those surfaces are live
4. Tighten the authenticated app chrome so signed-in users do not see generic sign-in CTAs

## Later

1. Tighten chart drill-downs and analytics interactions
2. Improve cluster narratives and scoring quality on real imported portfolios
3. Add the constellation view as a live imported-portfolio visualization instead of a demo preview
