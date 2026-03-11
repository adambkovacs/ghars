import type { OverviewMetrics, RepoCatalog, UserNote, UserRepoState } from "@/lib/domain/types";
import { generateNeglectSignals } from "@/lib/services/generateNeglectSignals";

export function buildOverviewMetrics(input: {
  now: Date;
  repositories: RepoCatalog[];
  states: UserRepoState[];
  notes: UserNote[];
}): OverviewMetrics {
  const repoById = new Map(input.repositories.map((repo) => [repo.id, repo]));
  const languageCounts = new Map<string, number>();
  const topicCounts = new Map<string, number>();
  const stateDistribution: OverviewMetrics["stateDistribution"] = {
    saved: 0,
    watching: 0,
    started: 0,
    parked: 0,
  };

  for (const state of input.states) {
    stateDistribution[state.state] += 1;
    const repo = repoById.get(state.repoId);
    if (!repo) {
      continue;
    }

    if (repo.language) {
      languageCounts.set(repo.language, (languageCounts.get(repo.language) ?? 0) + 1);
    }
    for (const topic of repo.topics) {
      topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
    }
  }

  const neglectedCount = generateNeglectSignals({
    now: input.now,
    states: input.states,
    notes: input.notes,
    events: [],
  }).length;

  return {
    totalStars: input.states.length,
    annotatedCount: input.notes.length,
    startedCount: stateDistribution.started,
    watchingCount: stateDistribution.watching,
    parkedCount: stateDistribution.parked,
    neglectedCount,
    stateDistribution,
    topLanguages: [...languageCounts.entries()]
      .map(([language, count]) => ({ language, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 5),
    topTopics: [...topicCounts.entries()]
      .map(([topic, count]) => ({ topic, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 8),
  };
}
