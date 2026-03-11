import type {
  ClusterNarrative,
  PortfolioEventType,
  RepoCatalog,
  RepoCluster,
  RepoSnapshotDaily,
  UserRepoState,
} from "@/lib/domain/types";
import { clamp, monthBucket, slugify, unique } from "@/lib/domain/utils";
import {
  demoClusters as sourceClusters,
  demoEvents as sourceEvents,
  demoNotes,
  demoNow,
  demoRepositories,
  demoSnapshots,
  demoStates,
} from "@/lib/demo/portfolio";
import {
  buildOverviewMetrics,
  buildTemporalDrift,
  computeMomentumScore,
  generateNeglectSignals,
  generateReport,
  searchPortfolio,
} from "@/lib/services";

export type RepoState = UserRepoState["state"];

export type RepoMetricPoint = {
  label: string;
  value: number;
};

export type DemoRepo = {
  owner: string;
  name: string;
  fullName: string;
  cluster: string;
  state: RepoState;
  language: string;
  summary: string;
  description: string;
  topics: string[];
  notes: string[];
  starredAt: string;
  lastPushedAt: string;
  lastRelease: string;
  importance: number;
  momentum: number;
  starDelta7d: number;
  forkDelta30d: number;
  userTouch14d: number;
  neglect: number;
  openIssues: number;
  archived: boolean;
  homepage?: string;
  sparkline: number[];
  driftSignature: RepoMetricPoint[];
};

export type DemoCluster = {
  slug: string;
  name: string;
  hue: string;
  accent: string;
  description: string;
  repoCount: number;
  momentum: number;
  coverage: number;
};

export type DemoReport = {
  slug: string;
  title: string;
  cadence: "weekly" | "monthly";
  generatedAt: string;
  summary: string;
  bullets: string[];
};

export type DemoEvent = {
  type: "starred" | "note" | "started" | "watching" | "release";
  title: string;
  timestamp: string;
  repo: string;
  detail: string;
};

const clusterVisuals = [
  {
    hue: "from-cyan-400 via-sky-500 to-blue-600",
    accent: "#5eead4",
    description: "Coordination, pipelines, background jobs, and the repos that keep the system moving.",
  },
  {
    hue: "from-amber-300 via-orange-400 to-rose-500",
    accent: "#fdba74",
    description: "Motion, rendering, charts, and interaction systems that shape the product surface.",
  },
  {
    hue: "from-emerald-300 via-teal-400 to-cyan-500",
    accent: "#34d399",
    description: "Applied AI, retrieval, and interface tooling with direct product leverage.",
  },
  {
    hue: "from-fuchsia-400 via-violet-500 to-indigo-600",
    accent: "#c084fc",
    description: "Knowledge structures, portfolio memory, and benchmark references.",
  },
] as const;

const repoById = new Map(demoRepositories.map((repo) => [repo.id, repo]));
const stateByRepoId = new Map(demoStates.map((state) => [state.repoId, state]));
const snapshotByRepoId = new Map(demoSnapshots.map((snapshot) => [snapshot.repoId, snapshot]));
const clusterByRepoId = new Map(
  sourceClusters.flatMap((cluster) => cluster.repoIds.map((repoId) => [repoId, cluster] as const))
);

const notesByRepoId = new Map<string, typeof demoNotes>();
for (const note of demoNotes) {
  const notes = notesByRepoId.get(note.repoId) ?? [];
  notes.push(note);
  notesByRepoId.set(note.repoId, notes);
}

const eventsByRepoId = new Map<string, typeof sourceEvents>();
for (const event of sourceEvents) {
  const events = eventsByRepoId.get(event.repoId) ?? [];
  events.push(event);
  eventsByRepoId.set(event.repoId, events);
}

function shortMonth(month: string) {
  const [year, monthNumber] = month.split("-");
  return new Date(`${year}-${monthNumber}-01T00:00:00.000Z`).toLocaleDateString("en-US", {
    month: "short",
  });
}

function buildCurrentSnapshot(repo: RepoCatalog): RepoSnapshotDaily {
  return {
    repoId: repo.id,
    snapshotDate: demoNow,
    stargazersCount: repo.stargazerCount,
    forksCount: repo.forksCount,
    openIssuesCount: repo.openIssuesCount,
    pushedAt: repo.pushedAt,
    archived: repo.archived,
    lastReleaseAt: repo.lastReleaseAt,
  };
}

function buildSyntheticSnapshot(repo: RepoCatalog, index: number): RepoSnapshotDaily {
  const starDrop = Math.max(18, Math.round(repo.stargazerCount * 0.012) + index * 7);
  const forkDrop = Math.max(3, Math.round(repo.forksCount * 0.035) + index);
  return {
    repoId: repo.id,
    snapshotDate: new Date(demoNow.getTime() - 7 * 24 * 60 * 60 * 1000),
    stargazersCount: Math.max(0, repo.stargazerCount - starDrop),
    forksCount: Math.max(0, repo.forksCount - forkDrop),
    openIssuesCount: Math.max(0, repo.openIssuesCount - (index % 5)),
    pushedAt: repo.pushedAt,
    archived: repo.archived,
    lastReleaseAt: repo.lastReleaseAt,
  };
}

function buildSparkline(repo: RepoCatalog, starDelta7d: number, index: number) {
  const range = Math.max(24, starDelta7d * 2.4 + (index + 1) * 9);
  const start = Math.max(1, repo.stargazerCount - range);
  return Array.from({ length: 10 }, (_, pointIndex) => {
    const progress = pointIndex / 9;
    const easing = progress * progress * (2.4 - progress);
    const wobble = Math.sin((pointIndex + 1) * (index + 1) * 0.4) * range * 0.035;
    return Math.round(start + range * easing + wobble);
  });
}

function buildDriftSignature(repo: RepoCatalog, cluster: RepoCluster | undefined, index: number): RepoMetricPoint[] {
  const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const base = 14 + index * 4;
  const topicBias = repo.topics.length * 3 + (cluster?.repoIds.length ?? 1) * 2;
  return labels.map((label, labelIndex) => ({
    label,
    value: Math.round(base + topicBias + labelIndex * (4 + (index % 3))),
  }));
}

function buildEventDetail(type: PortfolioEventType, repo: RepoCatalog, state: UserRepoState | undefined, payload?: Record<string, unknown>) {
  switch (type) {
    case "start_session_started":
      return {
        type: "started" as const,
        title: `Started a session for ${repo.name}`,
        detail: `This repo is now on the active bench${payload?.minutes ? `, with ${payload.minutes} minutes logged` : ""}.`,
      };
    case "start_session_ended":
      return {
        type: "started" as const,
        title: `Closed a work session for ${repo.name}`,
        detail: "A started repo cooled off after an active pass through the docs or code.",
      };
    case "state_changed":
      return {
        type: state?.state === "watching" ? ("watching" as const) : ("started" as const),
        title: `${repo.name} moved to ${String(payload?.to ?? state?.state ?? "watching")}`,
        detail: `State moved from ${String(payload?.from ?? "saved")} to ${String(payload?.to ?? state?.state ?? "watching")}.`,
      };
    case "repo_refreshed":
      return {
        type: "release" as const,
        title: `${repo.name} refreshed`,
        detail: "Fresh repo facts landed from the scheduled sync loop.",
      };
    case "note_added":
      return {
        type: "note" as const,
        title: `New note on ${repo.name}`,
        detail: "Fresh human context was attached to this repo.",
      };
    case "repo_starred":
      return {
        type: "starred" as const,
        title: `Starred ${repo.name}`,
        detail: "A new repo entered the portfolio.",
      };
  }
}

function buildClusterNarrativesSync(clusters: RepoCluster[], momentumByRepoId: Map<string, number>) {
  return clusters.map((cluster) => {
    const repos = cluster.repoIds
      .map((repoId) => repoById.get(repoId))
      .filter((repo): repo is RepoCatalog => Boolean(repo));
    const topics = unique(repos.flatMap((repo) => repo.topics)).slice(0, 4);
    const averageMomentum =
      repos.reduce((total, repo) => total + (momentumByRepoId.get(repo.id) ?? 0), 0) /
      Math.max(1, repos.length);

    return {
      clusterId: cluster.id,
      label: cluster.label,
      narrative: `${cluster.label} clusters ${repos.length} repos around ${
        topics.join(", ") || "mixed signals"
      }, with average momentum ${averageMomentum.toFixed(1)}.`,
      topTopics: topics,
      repoCount: repos.length,
    } satisfies ClusterNarrative;
  });
}

const momentumEntries = demoRepositories
  .map((repo, index) => {
    const previousSnapshot = snapshotByRepoId.get(repo.id) ?? buildSyntheticSnapshot(repo, index);
    const userTouchCount14d = (eventsByRepoId.get(repo.id) ?? []).filter(
      (event) => demoNow.getTime() - event.occurredAt.getTime() <= 14 * 24 * 60 * 60 * 1000
    ).length;

    return computeMomentumScore({
      repo,
      previousSnapshot,
      currentSnapshot: buildCurrentSnapshot(repo),
      userTouchCount14d,
      now: demoNow,
    });
  })
  .sort((left, right) => right.score - left.score);

const momentumEntryByRepoId = new Map(momentumEntries.map((entry) => [entry.repoId, entry]));
const momentumScoreByRepoId = new Map(momentumEntries.map((entry) => [entry.repoId, entry.score]));

const neglectSignals = generateNeglectSignals({
  now: demoNow,
  states: demoStates,
  notes: demoNotes,
  events: sourceEvents,
});
const neglectByRepoId = new Map(neglectSignals.map((signal) => [signal.repoId, signal]));

function buildImportance(repo: RepoCatalog, state: UserRepoState, momentumScore: number) {
  const starsWeight = Math.log10(repo.stargazerCount + 10) * 17;
  const stateWeight =
    state.state === "started" ? 14 : state.state === "watching" ? 10 : state.state === "parked" ? 2 : 6;
  return clamp(Math.round(starsWeight + stateWeight + momentumScore * 0.28), 42, 98);
}

const clusterCatalog = sourceClusters.map((cluster, index) => {
  const visual = clusterVisuals[index % clusterVisuals.length];
  const repoCount = cluster.repoIds.length;
  const averageMomentum =
    cluster.repoIds.reduce((total, repoId) => total + (momentumEntryByRepoId.get(repoId)?.score ?? 0), 0) /
    Math.max(1, repoCount);

  return {
    id: cluster.id,
    slug: slugify(cluster.label),
    name: cluster.label,
    hue: visual.hue,
    accent: visual.accent,
    description: visual.description,
    repoCount,
    momentum: Math.round(averageMomentum * 10) / 10,
    coverage: Math.round((repoCount / Math.max(1, demoRepositories.length)) * 100),
  } satisfies DemoCluster & { id: string };
});

const displayClusterById = new Map(clusterCatalog.map((cluster) => [cluster.id, cluster]));

export const demoRepos: DemoRepo[] = demoRepositories
  .flatMap((repo, index) => {
    const state = stateByRepoId.get(repo.id);
    if (!state) {
      return [];
    }

    const notes = notesByRepoId.get(repo.id) ?? [];
    const cluster = clusterByRepoId.get(repo.id);
    const displayCluster = cluster ? displayClusterById.get(cluster.id) : undefined;
    const momentum = momentumEntryByRepoId.get(repo.id);
    const neglect = neglectByRepoId.get(repo.id);

    return [
      {
        owner: repo.owner,
        name: repo.name,
        fullName: repo.fullName,
        cluster: displayCluster?.name ?? "Unclustered",
        state: state.state,
        language: repo.language ?? "Unknown",
        summary: notes[0]?.content ?? repo.description,
        description: repo.description,
        topics: repo.topics,
        notes: notes.map((note) => note.content),
        starredAt: state.starredAt.toISOString(),
        lastPushedAt: repo.pushedAt?.toISOString() ?? demoNow.toISOString(),
        lastRelease: repo.lastReleaseAt?.toISOString() ?? demoNow.toISOString(),
        importance: buildImportance(repo, state, momentum?.score ?? 0),
        momentum: Math.round((momentum?.score ?? 0) * 10) / 10,
        starDelta7d: momentum?.starDelta7d ?? 0,
        forkDelta30d: momentum?.forkDelta30d ?? 0,
        userTouch14d: momentum?.userTouch14d ?? 0,
        neglect: Math.round((neglect?.score ?? 0) * 10) / 10,
        openIssues: repo.openIssuesCount,
        archived: repo.archived,
        homepage: repo.homepage ?? undefined,
        sparkline: buildSparkline(repo, momentum?.starDelta7d ?? 0, index),
        driftSignature: buildDriftSignature(repo, cluster, index),
      } satisfies DemoRepo,
    ];
  })
  .sort((left, right) => right.momentum - left.momentum);

export const demoClusters: DemoCluster[] = clusterCatalog.map((cluster) => ({
  slug: cluster.slug,
  name: cluster.name,
  hue: cluster.hue,
  accent: cluster.accent,
  description: cluster.description,
  repoCount: cluster.repoCount,
  momentum: cluster.momentum,
  coverage: cluster.coverage,
}));

const overview = buildOverviewMetrics({
  now: demoNow,
  repositories: demoRepositories,
  states: demoStates,
  notes: demoNotes,
});

const drift = buildTemporalDrift({
  repositories: demoRepositories,
  states: demoStates,
});

const orderedMonths = [...new Set(demoStates.map((state) => monthBucket(state.starredAt)))].sort();
const clusterCountByMonth = new Map<string, number>();
for (const state of demoStates) {
  const cluster = clusterByRepoId.get(state.repoId);
  const displayCluster = cluster ? displayClusterById.get(cluster.id) : undefined;
  if (!displayCluster) {
    continue;
  }

  const key = `${monthBucket(state.starredAt)}:${displayCluster.name}`;
  clusterCountByMonth.set(key, (clusterCountByMonth.get(key) ?? 0) + 1);
}

export const demoDriftSeries = orderedMonths.map((month, monthIndex) => {
  const row: Record<string, string | number> = { month: shortMonth(month) };

  for (const cluster of demoClusters) {
    const runningTotal = orderedMonths.slice(0, monthIndex + 1).reduce((total, candidateMonth) => {
      return total + (clusterCountByMonth.get(`${candidateMonth}:${cluster.name}`) ?? 0);
    }, 0);
    row[cluster.name] = runningTotal;
  }

  return row as { month: string } & Record<string, number>;
});

const momentumBaseline = Math.max(
  18,
  Math.round(momentumEntries.slice(0, 4).reduce((total, entry) => total + entry.score, 0) * 0.35)
);

export const demoMomentumTimeline = Array.from({ length: 10 }, (_, index) => {
  const timestamp = new Date(demoNow.getTime() - (9 - index) * 24 * 60 * 60 * 1000);
  const wobble = Math.sin(index * 0.8) * 4 + (index % 3);
  return {
    label: timestamp.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    value: Math.max(10, Math.round(momentumBaseline * (0.68 + index * 0.055) + wobble)),
  };
});

export const demoEvents: DemoEvent[] = sourceEvents
  .map((event) => {
    const repo = repoById.get(event.repoId);
    if (!repo) {
      return null;
    }

    const state = stateByRepoId.get(event.repoId);
    const detail = buildEventDetail(event.type, repo, state, event.payload);
    return {
      type: detail.type,
      title: detail.title,
      timestamp: event.occurredAt.toISOString(),
      repo: repo.fullName,
      detail: detail.detail,
    } satisfies DemoEvent;
  })
  .filter((event): event is DemoEvent => Boolean(event))
  .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime());

function buildReport(slug: string, cadence: "weekly" | "monthly", generatedAt: Date, title: string) {
  const clusterNarratives = buildClusterNarrativesSync(sourceClusters, momentumScoreByRepoId);
  const snapshot = generateReport({
    id: slug,
    period: cadence,
    generatedAt,
    metrics: {
      ...overview,
      neglectedCount: neglectSignals.length,
    },
    momentum: momentumEntries,
    neglectSignals,
    clusters: clusterNarratives,
    repositories: demoRepositories,
  });

  return {
    slug,
    title,
    cadence,
    generatedAt: snapshot.generatedAt.toISOString(),
    summary: snapshot.summary,
    bullets: snapshot.sections.map((section) => section.summary),
  } satisfies DemoReport;
}

export const demoReports: DemoReport[] = [
  buildReport(
    "weekly-portfolio-pulse",
    "weekly",
    new Date(demoNow.getTime() - 18 * 60 * 60 * 1000),
    "Weekly portfolio pulse"
  ),
  buildReport(
    "monthly-star-atlas",
    "monthly",
    new Date(demoNow.getTime() - 12 * 24 * 60 * 60 * 1000),
    "Monthly star atlas"
  ),
];

export const demoSavedViews = [
  { name: "Started now", query: "state:started" },
  { name: "Watchlist", query: "state:watching" },
  { name: "Visual systems", query: "visualization" },
  { name: "Knowledge layer", query: "knowledge" },
].map((view) => ({
  ...view,
  count: searchDemoRepos(view.query).length,
}));

function normalizeSearchQuery(query: string) {
  const filters: { state?: RepoState[] } = {};
  const stateMatch = query.match(/state:(saved|watching|started|parked)/i);
  if (stateMatch) {
    filters.state = [stateMatch[1].toLowerCase() as RepoState];
  }

  return {
    query: query.replace(/state:(saved|watching|started|parked)/gi, "").trim(),
    filters,
  };
}

function toDemoRepo(repo: RepoCatalog): DemoRepo | undefined {
  return demoRepos.find((entry) => entry.fullName === repo.fullName);
}

export function getOverviewMetrics() {
  return {
    total: overview.totalStars,
    annotated: overview.annotatedCount,
    started: overview.startedCount,
    watching: overview.watchingCount,
    parked: overview.parkedCount,
    neglected: neglectSignals.length,
  };
}

export function getTopMomentumRepos(limit = 4) {
  return demoRepos.slice(0, limit);
}

export function getHealthRows() {
  return neglectSignals.slice(0, 6).map((signal) => {
    const repo = repoById.get(signal.repoId);
    const state = stateByRepoId.get(signal.repoId);
    return {
      fullName: repo?.fullName ?? signal.repoId,
      issue: signal.reasons.join(", "),
      state: state?.state ?? "saved",
      neglect: signal.score.toFixed(1),
    };
  });
}

export function searchDemoRepos(query: string) {
  const normalized = normalizeSearchQuery(query);
  const results = searchPortfolio({
    query: normalized.query,
    repositories: demoRepositories,
    userStates: demoStates,
    notes: demoNotes,
    filters: normalized.filters,
  });

  return results
    .map((result) => toDemoRepo(result.repo))
    .filter((repo): repo is DemoRepo => Boolean(repo));
}

export function getRepo(owner: string, name: string) {
  return demoRepos.find((repo) => repo.owner === owner && repo.name === name);
}

export const demoDriftNarrative = {
  rising: drift.risingTopics.map((entry) => `${entry.topic} +${entry.delta}`),
  cooling: drift.coolingTopics.map((entry) => `${entry.topic} ${entry.delta}`),
};
