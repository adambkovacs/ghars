import type { RepoCatalog, TopicDriftSummary, UserRepoState } from "@/lib/domain/types";
import { monthBucket } from "@/lib/domain/utils";

export function buildTemporalDrift(input: {
  repositories: RepoCatalog[];
  states: UserRepoState[];
}): TopicDriftSummary {
  const repoById = new Map(input.repositories.map((repo) => [repo.id, repo]));
  const monthTopicCounts = new Map<string, number>();
  const orderedMonths = [...new Set(input.states.map((state) => monthBucket(state.starredAt)))].sort();

  for (const state of input.states) {
    const repo = repoById.get(state.repoId);
    if (!repo) {
      continue;
    }

    const month = monthBucket(state.starredAt);
    const dominantTopic = repo.topics[0] ?? repo.language ?? "uncategorized";
    const key = `${month}:${dominantTopic}`;
    monthTopicCounts.set(key, (monthTopicCounts.get(key) ?? 0) + 1);
  }

  const midpoint = Math.max(1, Math.floor(orderedMonths.length / 2));
  const earlyCounts = new Map<string, number>();
  const lateCounts = new Map<string, number>();

  for (const [key, count] of monthTopicCounts.entries()) {
    const [month, topic] = key.split(":");
    const target = orderedMonths.indexOf(month) < midpoint ? earlyCounts : lateCounts;
    target.set(topic, (target.get(topic) ?? 0) + count);
  }

  const topics = new Set([...earlyCounts.keys(), ...lateCounts.keys()]);
  const deltas = [...topics].map((topic) => ({
    topic,
    delta: (lateCounts.get(topic) ?? 0) - (earlyCounts.get(topic) ?? 0),
  }));

  return {
    series: [...monthTopicCounts.entries()]
      .map(([key, count]) => {
        const [label, topic] = key.split(":");
        return { label, topic, count };
      })
      .sort((left, right) => left.label.localeCompare(right.label)),
    risingTopics: deltas
      .filter((entry) => entry.delta > 0)
      .sort((left, right) => right.delta - left.delta)
      .slice(0, 4),
    coolingTopics: deltas
      .filter((entry) => entry.delta < 0)
      .sort((left, right) => left.delta - right.delta)
      .slice(0, 4),
  };
}
