import type { Clock, GitHubGateway, PortfolioEventStore, RepoCatalogStore, UserRepoStateStore } from "@/lib/ports";

export function createImportStarredReposService(deps: {
  github: GitHubGateway;
  repoCatalogStore: RepoCatalogStore;
  userRepoStateStore: UserRepoStateStore;
  eventStore: PortfolioEventStore;
  clock: Clock;
}) {
  return async function importStarredRepos(userId: string) {
    let cursor: string | null | undefined = null;
    let imported = 0;
    const touchedAt = deps.clock.now();

    do {
      const page = await deps.github.listStarred(cursor);
      await deps.repoCatalogStore.upsertMany(page.edges.map((edge) => edge.repo));
      await deps.userRepoStateStore.upsertStarEdges(userId, page.edges, touchedAt);
      await deps.eventStore.append(
        page.edges.map((edge) => ({
          id: `evt-star-${userId}-${edge.repo.id}-${edge.starredAt.toISOString()}`,
          userId,
          repoId: edge.repo.id,
          type: "repo_starred" as const,
          occurredAt: edge.starredAt,
          payload: { fullName: edge.repo.fullName },
        }))
      );
      imported += page.edges.length;
      cursor = page.nextCursor;
    } while (cursor);

    return {
      imported,
      completedAt: touchedAt,
    };
  };
}
