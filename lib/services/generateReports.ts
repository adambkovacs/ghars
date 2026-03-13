import type {
  ClusterNarrative,
  NeglectSignal,
  OverviewMetrics,
  RepoCatalog,
  RepoMomentum,
  ReportPeriod,
  ReportSnapshot,
} from "../domain/types";

export function generateReport(input: {
  id: string;
  period: ReportPeriod;
  generatedAt: Date;
  metrics: OverviewMetrics;
  momentum: RepoMomentum[];
  neglectSignals: NeglectSignal[];
  clusters: ClusterNarrative[];
  repositories: RepoCatalog[];
}): ReportSnapshot {
  const repoById = new Map(input.repositories.map((repo) => [repo.id, repo]));
  const topMover = input.momentum[0];
  const topMoverName = topMover ? repoById.get(topMover.repoId)?.fullName ?? topMover.repoId : "none";
  const hottestCluster = input.clusters[0];

  return {
    id: input.id,
    period: input.period,
    generatedAt: input.generatedAt,
    summary: `${input.metrics.totalStars} tracked repos, ${input.metrics.startedCount} started, ${input.neglectSignals.length} neglected. Top mover: ${topMoverName}.`,
    sections: [
      {
        id: `${input.id}-overview`,
        title: "Portfolio Overview",
        summary: `${input.metrics.annotatedCount} notes and ${input.metrics.watchingCount} active watch slots keep the portfolio warm.`,
        evidenceRepoIds: [],
      },
      {
        id: `${input.id}-momentum`,
        title: "Momentum",
        summary: topMover
          ? `${topMoverName} leads with score ${topMover.score.toFixed(2)}.`
          : "No momentum signals yet.",
        evidenceRepoIds: topMover ? [topMover.repoId] : [],
      },
      {
        id: `${input.id}-neglect`,
        title: "Neglect",
        summary:
          input.neglectSignals.length > 0
            ? `${input.neglectSignals.length} repos need attention, led by ${
                repoById.get(input.neglectSignals[0].repoId)?.fullName ?? input.neglectSignals[0].repoId
              }.`
            : "No neglect hotspots detected.",
        evidenceRepoIds: input.neglectSignals.slice(0, 3).map((signal) => signal.repoId),
      },
      {
        id: `${input.id}-clusters`,
        title: "Cluster Narrative",
        summary: hottestCluster
          ? `${hottestCluster.label} is the leading cluster. ${hottestCluster.narrative}`
          : "No cluster narratives yet.",
        evidenceRepoIds: [],
      },
    ],
  };
}
