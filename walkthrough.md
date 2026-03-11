# walkthrough

## Goal

Build `ghars` as a dashboard-first GitHub stars observability product with memory, analytics, and momentum.

## Current implementation shape

- Demo-mode experience works without provider keys.
- Production adapters are scaffolded for Clerk, Convex, GitHub, and OpenRouter.
- Core domain logic is separated from UI and storage.

## Follow-up

- Connect real GitHub import
- Validate Convex deployment and cron jobs
- Tune scoring and cluster narratives with real data
