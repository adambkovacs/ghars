import type { ConstellationLayout, RepoCluster, RepoMomentum } from "@/lib/domain/types";

export function buildConstellationLayout(input: {
  clusters: RepoCluster[];
  momentum: RepoMomentum[];
}): ConstellationLayout {
  const momentumByRepoId = new Map(input.momentum.map((entry) => [entry.repoId, entry]));
  const clusterRadius = 280;
  const clusterCount = Math.max(1, input.clusters.length);

  const clusters = input.clusters.map((cluster, index) => {
    const angle = (Math.PI * 2 * index) / clusterCount;
    return {
      id: cluster.id,
      label: cluster.label,
      x: Math.cos(angle) * clusterRadius,
      y: Math.sin(angle) * clusterRadius,
      radius: 120,
    };
  });

  const clusterMap = new Map(clusters.map((cluster) => [cluster.id, cluster]));
  const nodes = input.clusters.flatMap((cluster) => {
    const center = clusterMap.get(cluster.id);
    if (!center) {
      return [];
    }

    return cluster.repoIds.map((repoId, index) => {
      const angle = (Math.PI * 2 * index) / Math.max(1, cluster.repoIds.length);
      const orbit = 26 + index * 10;
      const repoMomentum = momentumByRepoId.get(repoId);
      return {
        id: `${cluster.id}-${repoId}`,
        repoId,
        clusterId: cluster.id,
        label: repoId,
        x: Number((center.x + Math.cos(angle) * orbit).toFixed(3)),
        y: Number((center.y + Math.sin(angle) * orbit).toFixed(3)),
        radius: 8 + Math.min(18, (repoMomentum?.score ?? 0) * 12),
        momentum: repoMomentum?.score ?? 0,
      };
    });
  });

  return {
    clusters,
    nodes,
  };
}
