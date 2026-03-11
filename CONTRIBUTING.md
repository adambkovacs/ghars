# Contributing

## Principles

- Keep the product dashboard-first.
- Start each vertical slice with a failing acceptance test and a failing service test.
- Keep domain logic outside UI adapters.
- Avoid generic UI patterns. The interface should feel intentional.

## Workflow

1. Create or update tests first.
2. Implement the smallest slice that makes them pass.
3. Run `bun run lint`, `bun run typecheck`, and the relevant tests.
4. Keep docs in `task.md` and `walkthrough.md` current when scope changes.

## Environment

Use demo mode unless you are actively validating live integrations.
