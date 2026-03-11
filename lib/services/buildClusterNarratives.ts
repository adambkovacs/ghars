import type { AiGateway } from "@/lib/ports";
import type { ClusterNarrative, RepoCatalog, RepoCluster } from "@/lib/domain/types";
import { unique } from "@/lib/domain/utils";

export async function buildClusterNarratives(input: {
  clusters: RepoCluster[];
  repositories: RepoCatalog[];
  momentumByRepoId: Map<string, number>;
  aiGateway?: AiGateway;
}): Promise<ClusterNarrative[]> {
  const repoById = new Map(input.repositories.map((repo) => [repo.id, repo]));

  return Promise.all(
    input.clusters.map(async (cluster) => {
      const repos = cluster.repoIds
        .map((repoId) => repoById.get(repoId))
        .filter((repo): repo is RepoCatalog => Boolean(repo));
      const topTopics = unique(repos.flatMap((repo) => repo.topics)).slice(0, 4);
      const averageMomentum =
        repos.reduce((total, repo) => total + (input.momentumByRepoId.get(repo.id) ?? 0), 0) /
        Math.max(1, repos.length);

      const fallbackNarrative = `${cluster.label} holds ${repos.length} repos, led by ${topTopics.join(
        ", "
      ) || "mixed signals"}, with average momentum ${averageMomentum.toFixed(2)}.`;

      const narrative = input.aiGateway
        ? await input.aiGateway.summarizeRepo({
            title: cluster.label,
            facts: [
              `Repo count: ${repos.length}`,
              `Topics: ${topTopics.join(", ") || "none"}`,
              `Average momentum: ${averageMomentum.toFixed(2)}`,
            ],
          })
        : fallbackNarrative;

      return {
        clusterId: cluster.id,
        label: cluster.label,
        narrative,
        topTopics,
        repoCount: repos.length,
      } satisfies ClusterNarrative;
    })
  );
}
