import { startOfUtcDay } from "../../domain/utils";
import type {
  PortfolioEvent,
  RepoCatalog,
  RepoSnapshotDaily,
  ReportSnapshot,
  UserNote,
  UserRepoState,
} from "../../domain/types";
import { buildClusterNarratives } from "../../services/buildClusterNarratives";
import { computeMomentumScore } from "../../services/computeMomentumScore";
import { generateNeglectSignals } from "../../services/generateNeglectSignals";
import { generateReport } from "../../services/generateReports";

export function deriveUserTouchCount14d(state: UserRepoState, now: Date) {
  const lastTouchedAt = state.lastTouchedAt ?? state.starredAt;
  const daysSinceTouch = Math.max(
    0,
    Math.floor((now.getTime() - lastTouchedAt.getTime()) / (1000 * 60 * 60 * 24))
  );

  return Math.max(0, 14 - Math.min(14, daysSinceTouch));
}

export function buildSnapshotMap(snapshots: RepoSnapshotDaily[]) {
  const snapshotMap = new Map<string, RepoSnapshotDaily[]>();

  for (const snapshot of snapshots) {
    const items = snapshotMap.get(snapshot.repoId) ?? [];
    items.push(snapshot);
    snapshotMap.set(snapshot.repoId, items);
  }

  for (const items of snapshotMap.values()) {
    items.sort((left, right) => right.snapshotDate.getTime() - left.snapshotDate.getTime());
  }

  return snapshotMap;
}

export function buildRuntimeRepoClusters(input: {
  repositories: RepoCatalog[];
  states: UserRepoState[];
}) {
  const grouped = new Map<string, { label: string; repoIds: string[] }>();
  const repoById = new Map(input.repositories.map((repo) => [repo.id, repo]));

  for (const state of input.states) {
    const repo = repoById.get(state.repoId);
    if (!repo) {
      continue;
    }

    const label = repo.topics[0] ?? repo.language ?? "uncategorized";
    const key = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const next = grouped.get(key) ?? { label, repoIds: [] as string[] };
    next.repoIds.push(repo.id);
    grouped.set(key, next);
  }

  return [...grouped.entries()].map(([key, value]) => ({
    id: `cluster-${key}`,
    label: value.label,
    repoIds: value.repoIds,
    topicSeed: value.label,
    languageSeed: null,
  }));
}

export function buildCurrentSnapshots(input: {
  now: Date;
  repositories: RepoCatalog[];
  states: UserRepoState[];
  notes: UserNote[];
  events: PortfolioEvent[];
  existingSnapshots: RepoSnapshotDaily[];
}) {
  const snapshotsByRepoId = buildSnapshotMap(input.existingSnapshots);
  const stateByRepoId = new Map(input.states.map((state) => [state.repoId, state]));
  const snapshotDate = startOfUtcDay(input.now);

  return input.repositories.flatMap((repo) => {
    const state = stateByRepoId.get(repo.id);
    if (!state) {
      return [];
    }

    const previousSnapshot = snapshotsByRepoId.get(repo.id)?.[0] ?? null;
    const currentSnapshot: RepoSnapshotDaily = {
      repoId: repo.id,
      snapshotDate,
      stargazersCount: repo.stargazerCount,
      forksCount: repo.forksCount,
      openIssuesCount: repo.openIssuesCount,
      pushedAt: repo.pushedAt,
      archived: repo.archived,
      lastReleaseAt: repo.lastReleaseAt,
    };

    const momentum = computeMomentumScore({
      repo,
      currentSnapshot,
      previousSnapshot,
      userTouchCount14d: 0,
      now: input.now,
    });

    return [
      {
        ...currentSnapshot,
        archived: repo.archived,
        momentumScore: momentum.score,
        neglectScore: null,
      } satisfies RepoSnapshotDaily,
    ];
  });
}

export async function generatePortfolioReports(input: {
  userId: string;
  githubLogin: string | null;
  lastSyncedAt: Date | null;
  repositories: RepoCatalog[];
  states: UserRepoState[];
  notes: UserNote[];
  events: PortfolioEvent[];
  snapshots: RepoSnapshotDaily[];
}) {
  const repoClusters = buildRuntimeRepoClusters({
    repositories: input.repositories,
    states: input.states,
  });

  const momentumByRepoId = new Map(
    input.repositories.map((repo) => {
      const history = buildSnapshotMap(input.snapshots).get(repo.id) ?? [];
      const currentSnapshot =
        history[0] ??
        ({
          repoId: repo.id,
          snapshotDate: input.lastSyncedAt ?? new Date(),
          stargazersCount: repo.stargazerCount,
          forksCount: repo.forksCount,
          openIssuesCount: repo.openIssuesCount,
          pushedAt: repo.pushedAt,
          archived: repo.archived,
          lastReleaseAt: repo.lastReleaseAt,
        } satisfies RepoSnapshotDaily);
      const previousSnapshot = history[1] ?? null;
      const state = input.states.find((candidate) => candidate.repoId === repo.id);

      const score = computeMomentumScore({
        repo,
        currentSnapshot,
        previousSnapshot,
        userTouchCount14d: state ? deriveUserTouchCount14d(state, input.lastSyncedAt ?? new Date()) : 0,
        now: input.lastSyncedAt ?? new Date(),
      });

      return [repo.id, score] as const;
    })
  );

  const clusterNarratives = await buildClusterNarratives({
    clusters: repoClusters,
    repositories: input.repositories,
    momentumByRepoId: new Map(
      [...momentumByRepoId.entries()].map(([repoId, momentum]) => [repoId, momentum.score])
    ),
  });

  const neglectSignals = generateNeglectSignals({
    now: input.lastSyncedAt ?? new Date(),
    states: input.states,
    notes: input.notes,
    events: input.events,
  });

  return (["weekly", "monthly"] as const).map((period) =>
    generateReport({
      id: `${period}-${input.userId}-${(input.lastSyncedAt ?? new Date()).toISOString()}`,
      period,
      generatedAt: input.lastSyncedAt ?? new Date(),
      metrics: {
        totalStars: input.states.length,
        annotatedCount: input.states.filter((state) => state.noteCount > 0).length,
        startedCount: input.states.filter((state) => state.state === "started").length,
        watchingCount: input.states.filter((state) => state.state === "watching").length,
        parkedCount: input.states.filter((state) => state.state === "parked").length,
        neglectedCount: neglectSignals.length,
        stateDistribution: {
          saved: input.states.filter((state) => state.state === "saved").length,
          watching: input.states.filter((state) => state.state === "watching").length,
          started: input.states.filter((state) => state.state === "started").length,
          parked: input.states.filter((state) => state.state === "parked").length,
        },
        topLanguages: [...new Map(
          input.repositories
            .map((repo) => repo.language)
            .filter((language): language is string => Boolean(language))
            .map((language) => [language, input.repositories.filter((repo) => repo.language === language).length])
        ).entries()]
          .map(([language, count]) => ({ language, count }))
          .sort((left, right) => right.count - left.count)
          .slice(0, 6),
        topTopics: [...new Map(
          input.repositories
            .flatMap((repo) => repo.topics)
            .map((topic) => [topic, input.repositories.filter((repo) => repo.topics.includes(topic)).length])
        ).entries()]
          .map(([topic, count]) => ({ topic, count }))
          .sort((left, right) => right.count - left.count)
          .slice(0, 8),
      },
      momentum: [...momentumByRepoId.values()],
      neglectSignals,
      clusters: clusterNarratives,
      repositories: input.repositories,
    })
  );
}

export async function buildDerivedArtifacts(input: {
  userId: string;
  githubLogin: string | null;
  lastSyncedAt: Date | null;
  repositories: RepoCatalog[];
  states: UserRepoState[];
  notes: UserNote[];
  events: PortfolioEvent[];
  existingSnapshots: RepoSnapshotDaily[];
}): Promise<{ snapshots: RepoSnapshotDaily[]; reports: ReportSnapshot[] }> {
  const snapshotsToSave = buildCurrentSnapshots({
    now: input.lastSyncedAt ?? new Date(),
    repositories: input.repositories,
    states: input.states,
    notes: input.notes,
    events: input.events,
    existingSnapshots: input.existingSnapshots,
  });

  const allSnapshots = [...input.existingSnapshots];
  for (const snapshot of snapshotsToSave) {
    const index = allSnapshots.findIndex(
      (candidate) =>
        candidate.repoId === snapshot.repoId &&
        candidate.snapshotDate.getTime() === snapshot.snapshotDate.getTime()
    );
    if (index >= 0) {
      allSnapshots[index] = snapshot;
    } else {
      allSnapshots.push(snapshot);
    }
  }

  const reports = await generatePortfolioReports({
    userId: input.userId,
    githubLogin: input.githubLogin,
    lastSyncedAt: input.lastSyncedAt,
    repositories: input.repositories,
    states: input.states,
    notes: input.notes,
    events: input.events,
    snapshots: allSnapshots,
  });

  return {
    snapshots: snapshotsToSave,
    reports,
  };
}
