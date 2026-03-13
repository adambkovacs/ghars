import os from "node:os";
import path from "node:path";
import { promises as fs, rmSync } from "node:fs";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type {
  GitHubStarPage,
  OverviewMetrics,
  PortfolioEvent,
  RepoCatalog,
  RepoReadme,
  RepoSnapshotDaily,
  RepoState,
  ReportPeriod,
  ReportSnapshot,
  SearchFilters,
  UserNote,
  UserRepoState,
} from "@/lib/domain/types";
import { demoRepositories, demoSnapshots, demoStates } from "@/lib/demo/portfolio";
import { appEnv } from "@/lib/env/app-env";
import type {
  Clock,
  GitHubGateway,
  PortfolioEventStore,
  RepoCatalogStore,
  RepoReadmeStore,
  ReportSnapshotStore,
  SnapshotStore,
  UserNoteStore,
  UserRepoStateStore,
} from "@/lib/ports";
import {
  buildOverviewMetrics,
  buildTemporalDrift,
  computeMomentumScore,
  createAddUserNoteService,
  createChangeRepoStateService,
  createImportStarredReposService,
  generateNeglectSignals,
} from "@/lib/services";
import { GitHubApiGateway } from "@/lib/adapters/github/githubApiGateway";
import {
  buildDerivedArtifacts,
  buildRuntimeRepoClusters,
  buildSnapshotMap,
  deriveUserTouchCount14d,
} from "@/lib/server/portfolio/artifacts";
import {
  buildReadmeEnrichment,
  selectReadmeCandidates,
} from "@/lib/server/portfolio/readme";

const TEST_RUNTIME_STATE_DIR = path.join(os.tmpdir(), "ghars-e2e-runtime");

type DashboardRepo = {
  fullName: string;
  description: string;
  language?: string | null;
  topics: string[];
  state: UserRepoState["state"];
  starredAt: Date;
  noteCount: number;
  stars: number;
};

export type PortfolioDashboardModel = {
  metrics: OverviewMetrics;
  recentRepos: DashboardRepo[];
  lastSyncedAt: Date | null;
  githubLogin: string | null;
  hasImport: boolean;
};

export type PortfolioSearchSavedView = {
  id: string;
  name: string;
  description: string;
  count: number;
  query: string;
  filters?: SearchFilters;
};

export type PortfolioSearchChip = {
  label: string;
  query: string;
};

export type PortfolioSearchModel = {
  hasImport: boolean;
  githubLogin: string | null;
  repositories: RepoCatalog[];
  states: UserRepoState[];
  notes: UserNote[];
  savedViews: PortfolioSearchSavedView[];
  quickQueries: PortfolioSearchChip[];
};

export type PortfolioRepoDetailModel = {
  hasImport: boolean;
  githubLogin: string | null;
  repo: RepoCatalog | null;
  state: UserRepoState | null;
  notes: UserNote[];
  readme: RepoReadme | null;
  starHistory: { capturedAt: Date; stars: number; momentumScore: number | null }[];
};

export type PortfolioAnalyticsCluster = {
  id: string;
  label: string;
  repoCount: number;
  averageMomentum: number;
  topRepoNames: string[];
};

export type PortfolioAnalyticsDriftRow = {
  month: string;
  [series: string]: number | string;
};

export type PortfolioAnalyticsRepo = {
  fullName: string;
  language?: string | null;
  state: UserRepoState["state"];
  noteCount: number;
  stars: number;
  lastTouchedAt: Date | null;
  pushedAt: Date | null | undefined;
  momentumScore: number;
  starDelta7d: number;
  forkDelta30d: number;
  trend: number[];
  reasons: string[];
  readmeSummary?: string | null;
  readmeFetchedAt?: Date | null;
};

export type PortfolioCoverageMetric = {
  id: string;
  label: string;
  count: number;
  total: number;
  percentage: number;
  summary: string;
};

export type PortfolioAnalyticsOpportunity = {
  fullName: string;
  state: UserRepoState["state"];
  language?: string | null;
  momentumScore: number;
  noteCount: number;
  starDelta7d: number;
  lastTouchedAt: Date | null;
  readmeSummary?: string | null;
  reasons: string[];
};

export type PortfolioAnalyticsNeglect = {
  fullName: string;
  state: UserRepoState["state"];
  noteCount: number;
  neglectScore: number;
  lastTouchedAt: Date | null;
  reasons: string[];
};

export type PortfolioAnalyticsActivity = {
  id: string;
  repoFullName: string;
  type: PortfolioEvent["type"];
  occurredAt: Date;
  summary: string;
};

export type PortfolioAnalyticsModel = {
  hasImport: boolean;
  githubLogin: string | null;
  metrics: OverviewMetrics;
  driftRows: PortfolioAnalyticsDriftRow[];
  clusters: PortfolioAnalyticsCluster[];
  constellationItems: { cluster: string; importance: number; momentum: number }[];
  topRepos: PortfolioAnalyticsRepo[];
  coverage: PortfolioCoverageMetric[];
  opportunities: PortfolioAnalyticsOpportunity[];
  neglectQueue: PortfolioAnalyticsNeglect[];
  recentActivity: PortfolioAnalyticsActivity[];
};

export type PortfolioRenderedReport = {
  id: string;
  title: string;
  period: ReportPeriod;
  generatedAt: Date;
  summary: string;
  sections: {
    id: string;
    title: string;
    summary: string;
    evidenceRepoNames: string[];
  }[];
};

export type PortfolioReportsModel = {
  hasImport: boolean;
  githubLogin: string | null;
  lastSyncedAt: Date | null;
  reports: PortfolioRenderedReport[];
};

type ImportRequest = {
  userId: string;
  githubUserId: string;
  githubLogin: string;
  accessToken: string;
};

type AddNoteRequest = {
  userId: string;
  repoFullName: string;
  content: string;
};

type ChangeStateRequest = {
  userId: string;
  repoFullName: string;
  nextState: RepoState;
};

type PortfolioRuntime = {
  importPortfolio(request: ImportRequest): Promise<{ imported: number; completedAt: Date }>;
  addNote(request: AddNoteRequest): Promise<UserNote>;
  changeRepoState(request: ChangeStateRequest): Promise<UserRepoState>;
  getDashboardModel(userId: string): Promise<PortfolioDashboardModel>;
  getSearchModel(userId: string): Promise<PortfolioSearchModel>;
  getRepoDetailModel(userId: string, owner: string, name: string): Promise<PortfolioRepoDetailModel>;
  getAnalyticsModel(userId: string): Promise<PortfolioAnalyticsModel>;
  getReportsModel(userId: string): Promise<PortfolioReportsModel>;
};

class SystemClock implements Clock {
  now() {
    return new Date();
  }
}

class InMemoryRepoCatalogStore implements RepoCatalogStore {
  constructor(private readonly records = new Map<string, RepoCatalog>()) {}

  async upsertMany(repos: RepoCatalog[]) {
    for (const repo of repos) {
      this.records.set(repo.id, repo);
    }
  }

  async listByIds(repoIds: string[]) {
    return repoIds.flatMap((repoId) => {
      const repo = this.records.get(repoId);
      return repo ? [repo] : [];
    });
  }
}

class InMemoryRepoReadmeStore implements RepoReadmeStore {
  constructor(private readonly records = new Map<string, RepoReadme>()) {}

  async get(repoId: string) {
    return this.records.get(repoId) ?? null;
  }

  async upsertMany(readmes: RepoReadme[]) {
    for (const readme of readmes) {
      this.records.set(readme.repoId, readme);
    }
  }
}

class InMemoryUserRepoStateStore implements UserRepoStateStore {
  constructor(private readonly records = new Map<string, UserRepoState>()) {}

  async upsertStarEdges(userId: string, edges: GitHubStarPage["edges"], touchedAt: Date) {
    for (const edge of edges) {
      const key = `${userId}:${edge.repo.id}`;
      const existing = this.records.get(key);
      this.records.set(key, {
        userId,
        repoId: edge.repo.id,
        state: existing?.state ?? "saved",
        starredAt: existing?.starredAt ?? edge.starredAt,
        tags: existing?.tags ?? [],
        noteCount: existing?.noteCount ?? 0,
        lastTouchedAt: touchedAt,
        lastViewedAt: existing?.lastViewedAt ?? null,
      });
    }
  }

  async get(userId: string, repoId: string) {
    return this.records.get(`${userId}:${repoId}`) ?? null;
  }

  async listByUser(userId: string) {
    return [...this.records.values()].filter((state) => state.userId === userId);
  }

  async save(state: UserRepoState) {
    this.records.set(`${state.userId}:${state.repoId}`, state);
  }
}

class InMemoryUserNoteStore implements UserNoteStore {
  constructor(private readonly notes: UserNote[] = []) {}

  async create(note: UserNote) {
    this.notes.push(note);
  }

  async listByUser(userId: string) {
    return this.notes.filter((note) => note.userId === userId);
  }

  async listByRepo(userId: string, repoId: string) {
    return this.notes.filter((note) => note.userId === userId && note.repoId === repoId);
  }
}

class InMemoryPortfolioEventStore implements PortfolioEventStore {
  constructor(private readonly events: PortfolioEvent[] = []) {}

  async append(events: PortfolioEvent[]) {
    this.events.push(...events);
  }

  async listByUser(userId: string) {
    return this.events.filter((event) => event.userId === userId);
  }
}

class InMemorySnapshotStore implements SnapshotStore {
  constructor(private readonly snapshots: RepoSnapshotDaily[] = []) {}

  async listLatest(repoIds: string[]) {
    return this.snapshots
      .filter((snapshot) => repoIds.includes(snapshot.repoId))
      .sort((left, right) => right.snapshotDate.getTime() - left.snapshotDate.getTime());
  }

  async saveMany(snapshots: RepoSnapshotDaily[]) {
    for (const snapshot of snapshots) {
      const existingIndex = this.snapshots.findIndex(
        (candidate) =>
          candidate.repoId === snapshot.repoId &&
          candidate.snapshotDate.getTime() === snapshot.snapshotDate.getTime()
      );

      if (existingIndex >= 0) {
        this.snapshots[existingIndex] = snapshot;
      } else {
        this.snapshots.push(snapshot);
      }
    }
  }
}

class InMemoryReportSnapshotStore implements ReportSnapshotStore {
  constructor(private readonly reports: ReportSnapshot[] = []) {}

  async save(_userId: string, report: ReportSnapshot) {
    const existingIndex = this.reports.findIndex((candidate) => candidate.period === report.period);
    if (existingIndex >= 0) {
      this.reports[existingIndex] = report;
      return;
    }

    this.reports.push(report);
  }

  async listByUser(_userId: string) {
    void _userId;
    return [...this.reports].sort((left, right) => right.generatedAt.getTime() - left.generatedAt.getTime());
  }
}

class ConvexRepoCatalogStore implements RepoCatalogStore {
  constructor(private readonly client: ConvexHttpClient) {}

  async upsertMany(repos: RepoCatalog[]) {
    if (repos.length === 0) {
      return;
    }

    await this.client.mutation(api.portfolio.upsertRepoCatalogs, {
      repos: repos.map((repo) => ({
        fullName: repo.fullName,
        owner: repo.owner,
        name: repo.name,
        description: repo.description || undefined,
        homepage: repo.homepage ?? undefined,
        primaryLanguage: repo.language ?? undefined,
        topics: repo.topics,
        stars: repo.stargazerCount,
        forks: repo.forksCount,
        openIssues: repo.openIssuesCount,
        watchers: repo.stargazerCount,
        archived: repo.archived,
        pushedAt: repo.pushedAt?.getTime() ?? undefined,
        latestReleaseAt: repo.lastReleaseAt?.getTime() ?? undefined,
        readmeSummary: repo.readmeSummary ?? undefined,
        readmeExcerpt: repo.readmeExcerpt ?? undefined,
        readmeFetchedAt: repo.readmeFetchedAt?.getTime() ?? undefined,
        createdAt: repo.createdAt?.getTime() ?? undefined,
        updatedAt: repo.updatedAt?.getTime() ?? Date.now(),
      })),
    });
  }

  async listByIds(repoIds: string[]) {
    if (repoIds.length === 0) {
      return [];
    }

    const repos = await this.client.query(api.portfolio.listReposByFullNames, {
      fullNames: repoIds,
    });

    return repos.map((repo) => ({
      id: repo.fullName.toLowerCase(),
      fullName: repo.fullName,
      owner: repo.owner,
      name: repo.name,
      description: repo.description ?? "",
      url: `https://github.com/${repo.fullName}`,
      homepage: repo.homepage ?? null,
      topics: repo.topics,
      language: repo.primaryLanguage ?? null,
      stargazerCount: repo.stars,
      forksCount: repo.forks,
      openIssuesCount: repo.openIssues,
      pushedAt: repo.pushedAt ? new Date(repo.pushedAt) : null,
      archived: repo.archived,
      isFork: false,
      lastReleaseAt: repo.latestReleaseAt ? new Date(repo.latestReleaseAt) : null,
      readmeSummary: repo.readmeSummary ?? null,
      readmeExcerpt: repo.readmeExcerpt ?? null,
      readmeFetchedAt: repo.readmeFetchedAt ? new Date(repo.readmeFetchedAt) : null,
      createdAt: repo.createdAt ? new Date(repo.createdAt) : null,
      updatedAt: repo.updatedAt ? new Date(repo.updatedAt) : null,
    }));
  }
}

class ConvexRepoReadmeStore implements RepoReadmeStore {
  constructor(private readonly client: ConvexHttpClient) {}

  async get(repoId: string) {
    const readme = await this.client.query(api.portfolio.getRepoReadmeByFullName, {
      repoFullName: repoId,
    });

    if (!readme) {
      return null;
    }

    return {
      repoId: repoId.toLowerCase(),
      content: readme.content,
      fetchedAt: new Date(readme.fetchedAt),
    };
  }

  async upsertMany(readmes: RepoReadme[]) {
    if (readmes.length === 0) {
      return;
    }

    await this.client.mutation(api.portfolio.upsertRepoReadmes, {
      readmes: readmes.map((readme) => ({
        repoFullName: readme.repoId,
        content: readme.content,
        fetchedAt: readme.fetchedAt.getTime(),
      })),
    });
  }
}

class ConvexUserRepoStateStore implements UserRepoStateStore {
  constructor(private readonly client: ConvexHttpClient) {}

  async upsertStarEdges(userId: string, edges: GitHubStarPage["edges"], touchedAt: Date) {
    if (edges.length === 0) {
      return;
    }

    await this.client.mutation(api.portfolio.upsertStarEdges, {
      authUserId: userId,
      edges: edges.map((edge) => ({
        fullName: edge.repo.fullName,
        starredAt: edge.starredAt.getTime(),
      })),
      touchedAt: touchedAt.getTime(),
    });
  }

  async get(userId: string, repoId: string) {
    const states = await this.listByUser(userId);
    return states.find((state) => state.repoId === repoId) ?? null;
  }

  async listByUser(userId: string) {
    const states = await this.client.query(api.portfolio.listUserRepoStates, {
      authUserId: userId,
    });

    return states.map((state) => ({
      userId,
      repoId: state.repoFullName.toLowerCase(),
      state: state.state,
      starredAt: new Date(state.starredAt),
      tags: state.tags,
      noteCount: state.noteCount,
      lastTouchedAt: state.lastTouchedAt ? new Date(state.lastTouchedAt) : null,
      lastViewedAt: state.lastViewedAt ? new Date(state.lastViewedAt) : null,
    }));
  }

  async save(state: UserRepoState) {
    await this.client.mutation(api.portfolio.changeRepoState, {
      authUserId: state.userId,
      repoFullName: state.repoId,
      state: state.state,
      starredAt: state.starredAt.getTime(),
      lastViewedAt: state.lastViewedAt?.getTime() ?? undefined,
      lastTouchedAt: state.lastTouchedAt?.getTime() ?? state.starredAt.getTime(),
      tags: state.tags,
      noteCount: state.noteCount,
    });
  }
}

class ConvexUserNoteStore implements UserNoteStore {
  constructor(private readonly client: ConvexHttpClient) {}

  async create(note: UserNote) {
    await this.client.mutation(api.portfolio.addNote, {
      authUserId: note.userId,
      repoFullName: note.repoId,
      body: note.content,
      createdAt: note.createdAt.getTime(),
      updatedAt: note.updatedAt.getTime(),
    });
  }

  async listByUser(userId: string) {
    const notes = await this.client.query(api.portfolio.listUserNotes, {
      authUserId: userId,
    });

    return notes.map((note) => ({
      id: note.id,
      userId,
      repoId: note.repoFullName.toLowerCase(),
      content: note.body,
      createdAt: new Date(note.createdAt),
      updatedAt: new Date(note.updatedAt),
    }));
  }

  async listByRepo(userId: string, repoId: string) {
    const notes = await this.listByUser(userId);
    return notes.filter((note) => note.repoId === repoId);
  }
}

class ConvexPortfolioEventStore implements PortfolioEventStore {
  constructor(private readonly client: ConvexHttpClient) {}

  async append(events: PortfolioEvent[]) {
    if (events.length === 0) {
      return;
    }

    await this.client.mutation(api.portfolio.appendPortfolioEvents, {
      authUserId: events[0].userId,
      events: events.map((event) => ({
        type: event.type,
        occurredAt: event.occurredAt.getTime(),
        repoFullName:
          typeof event.payload?.fullName === "string"
            ? event.payload.fullName
            : event.repoId,
        payload: event.payload,
      })),
    });
  }

  async listByUser(userId: string) {
    const events = await this.client.query(api.portfolio.listPortfolioEvents, {
      authUserId: userId,
    });

    return events
      .filter((event) => event.repoFullName)
      .map((event) => ({
        id: event.id,
        userId,
        repoId: event.repoFullName!.toLowerCase(),
        type: event.type,
        occurredAt: new Date(event.createdAt),
        payload:
          event.metadata && typeof event.metadata === "object"
            ? (event.metadata as Record<string, unknown>)
            : undefined,
      }));
  }
}

class ConvexSnapshotStore implements SnapshotStore {
  constructor(private readonly client: ConvexHttpClient) {}

  async listLatest(repoIds: string[]) {
    if (repoIds.length === 0) {
      return [];
    }

    const snapshots = await this.client.query(api.portfolio.listRepoSnapshotsByFullNames, {
      fullNames: repoIds,
    });

    return snapshots
      .filter((snapshot) => repoIds.includes(snapshot.repoFullName.toLowerCase()))
      .map((snapshot) => ({
        repoId: snapshot.repoFullName.toLowerCase(),
        snapshotDate: new Date(snapshot.capturedAt),
        stargazersCount: snapshot.stars,
        forksCount: snapshot.forks,
        openIssuesCount: snapshot.openIssues,
        pushedAt: snapshot.pushedAt ? new Date(snapshot.pushedAt) : null,
        archived: false,
        lastReleaseAt: snapshot.latestReleaseAt ? new Date(snapshot.latestReleaseAt) : null,
        momentumScore: snapshot.momentumScore ?? null,
        neglectScore: snapshot.neglectScore ?? null,
      }))
      .sort((left, right) => right.snapshotDate.getTime() - left.snapshotDate.getTime());
  }

  async saveMany(snapshots: RepoSnapshotDaily[]) {
    if (snapshots.length === 0) {
      return;
    }

    await this.client.mutation(api.portfolio.saveRepoSnapshots, {
      snapshots: snapshots.map((snapshot) => ({
        repoFullName: snapshot.repoId,
        capturedAt: snapshot.snapshotDate.getTime(),
        stars: snapshot.stargazersCount,
        forks: snapshot.forksCount,
        openIssues: snapshot.openIssuesCount,
        pushedAt: snapshot.pushedAt?.getTime() ?? undefined,
        latestReleaseAt: snapshot.lastReleaseAt?.getTime() ?? undefined,
        momentumScore: snapshot.momentumScore ?? undefined,
        neglectScore: snapshot.neglectScore ?? undefined,
      })),
    });
  }
}

class ConvexReportSnapshotStore implements ReportSnapshotStore {
  constructor(private readonly client: ConvexHttpClient) {}

  async save(userId: string, report: ReportSnapshot) {
    await this.client.mutation(api.reports.storeReport, {
      authUserId: userId,
      period: report.period,
      title: report.period === "weekly" ? "Weekly live portfolio review" : "Monthly live portfolio review",
      summary: report.summary,
      highlights: report.sections.map((section) => section.summary).slice(0, 4),
      topRepoIds: report.sections.flatMap((section) => section.evidenceRepoIds).slice(0, 8),
      sections: report.sections.map((section) => ({
        id: section.id,
        title: section.title,
        summary: section.summary,
        evidenceRepoIds: section.evidenceRepoIds,
      })),
      syncCapturedAt: report.generatedAt.getTime(),
    });
  }

  async listByUser(userId: string) {
    const reports = await this.client.query(api.reports.listReports, {
      authUserId: userId,
    });

    return reports.map((report) => ({
      id: report._id,
      period: report.period,
      generatedAt: new Date(report.generatedAt),
      summary: report.summary,
      sections: report.sections.map((section) => ({
        id: section.id,
        title: section.title,
        summary: section.summary,
        evidenceRepoIds: [...section.evidenceRepoIds],
      })),
    }));
  }
}

async function persistDerivedArtifacts(input: {
  userId: string;
  githubLogin: string | null;
  lastSyncedAt: Date | null;
  repositories: RepoCatalog[];
  states: UserRepoState[];
  notes: UserNote[];
  events: PortfolioEvent[];
  snapshotStore: SnapshotStore;
  reportStore: ReportSnapshotStore;
}) {
  const existingSnapshots = await input.snapshotStore.listLatest(input.repositories.map((repo) => repo.id));
  const { snapshots, reports } = await buildDerivedArtifacts({
    userId: input.userId,
    githubLogin: input.githubLogin,
    lastSyncedAt: input.lastSyncedAt,
    repositories: input.repositories,
    states: input.states,
    notes: input.notes,
    events: input.events,
    existingSnapshots,
  });

  await input.snapshotStore.saveMany(snapshots);
  for (const report of reports) {
    await input.reportStore.save(input.userId, report);
  }
}

async function hydrateRepoReadmes(input: {
  repositories: RepoCatalog[];
  states: UserRepoState[];
  repoCatalogStore: RepoCatalogStore;
  repoReadmeStore: RepoReadmeStore;
  github: GitHubGateway;
  limit: number;
}) {
  const candidates = selectReadmeCandidates({
    repositories: input.repositories,
    states: input.states,
    limit: input.limit,
  });

  if (candidates.length === 0) {
    return input.repositories;
  }

  const hydratedReadmes: RepoReadme[] = [];
  const enrichedRepos: RepoCatalog[] = [];

  for (const repo of candidates) {
    try {
      const readme = await input.github.getReadme(repo.fullName);
      if (!readme) {
        continue;
      }

      hydratedReadmes.push(readme);
      enrichedRepos.push(buildReadmeEnrichment(repo, readme));
    } catch (error) {
      console.error(`Failed to hydrate README for ${repo.fullName}`, error);
    }
  }

  if (hydratedReadmes.length === 0) {
    return input.repositories;
  }

  await input.repoReadmeStore.upsertMany(hydratedReadmes);
  await input.repoCatalogStore.upsertMany(enrichedRepos);

  const enrichedById = new Map(enrichedRepos.map((repo) => [repo.id, repo]));
  return input.repositories.map((repo) => enrichedById.get(repo.id) ?? repo);
}

async function hydrateRepoReadmeOnDemand(input: {
  repo: RepoCatalog | null;
  accessToken: string | null;
  repoCatalogStore: RepoCatalogStore;
  repoReadmeStore: RepoReadmeStore;
}) {
  if (!input.repo || input.repo.readmeFetchedAt || !input.accessToken) {
    return input.repo;
  }

  try {
    const github = new GitHubApiGateway(input.accessToken);
    const readme = await github.getReadme(input.repo.fullName);
    if (!readme) {
      return input.repo;
    }

    const enrichedRepo = buildReadmeEnrichment(input.repo, readme);
    await input.repoReadmeStore.upsertMany([readme]);
    await input.repoCatalogStore.upsertMany([enrichedRepo]);
    return enrichedRepo;
  } catch (error) {
    console.error(`Failed to hydrate README on demand for ${input.repo.fullName}`, error);
    return input.repo;
  }
}

function getTestRuntimeStatePath(userId: string) {
  return path.join(TEST_RUNTIME_STATE_DIR, `${userId}.json`);
}

async function hydrateTestRuntimeState(
  runtime: {
    repoCatalogStore: InMemoryRepoCatalogStore;
    repoReadmeStore: InMemoryRepoReadmeStore;
    userRepoStateStore: InMemoryUserRepoStateStore;
    userNoteStore: InMemoryUserNoteStore;
    eventStore: InMemoryPortfolioEventStore;
    snapshotStore: InMemorySnapshotStore;
    reportStore: InMemoryReportSnapshotStore;
    connectionByUserId: Map<string, { githubLogin: string; lastSyncedAt: Date }>;
  },
  userId: string
) {
  if ((await runtime.userRepoStateStore.listByUser(userId)).length > 0) {
    return;
  }

  try {
    const raw = await fs.readFile(getTestRuntimeStatePath(userId), "utf8");
    const persisted = JSON.parse(raw) as {
      connection?: { githubLogin: string; lastSyncedAt: string };
      repositories: RepoCatalog[];
      states: Array<Omit<UserRepoState, "starredAt" | "lastTouchedAt" | "lastViewedAt"> & { starredAt: string; lastTouchedAt?: string | null; lastViewedAt?: string | null }>;
      notes: Array<Omit<UserNote, "createdAt" | "updatedAt"> & { createdAt: string; updatedAt: string }>;
      events: Array<Omit<PortfolioEvent, "occurredAt"> & { occurredAt: string }>;
      snapshots: Array<Omit<RepoSnapshotDaily, "snapshotDate" | "pushedAt" | "lastReleaseAt"> & { snapshotDate: string; pushedAt?: string | null; lastReleaseAt?: string | null }>;
      reports: Array<Omit<ReportSnapshot, "generatedAt"> & { generatedAt: string }>;
      readmes?: Array<{ repoId: string; content: string; fetchedAt: string }>;
    };

    await runtime.repoCatalogStore.upsertMany(persisted.repositories);
    for (const state of persisted.states) {
      await runtime.userRepoStateStore.save({
        ...state,
        starredAt: new Date(state.starredAt),
        lastTouchedAt: state.lastTouchedAt ? new Date(state.lastTouchedAt) : null,
        lastViewedAt: state.lastViewedAt ? new Date(state.lastViewedAt) : null,
      });
    }
    for (const note of persisted.notes) {
      await runtime.userNoteStore.create({
        ...note,
        createdAt: new Date(note.createdAt),
        updatedAt: new Date(note.updatedAt),
      });
    }
    await runtime.eventStore.append(
      persisted.events.map((event) => ({
        ...event,
        occurredAt: new Date(event.occurredAt),
      }))
    );
    await runtime.snapshotStore.saveMany(
      persisted.snapshots.map((snapshot) => ({
        ...snapshot,
        snapshotDate: new Date(snapshot.snapshotDate),
        pushedAt: snapshot.pushedAt ? new Date(snapshot.pushedAt) : null,
        lastReleaseAt: snapshot.lastReleaseAt ? new Date(snapshot.lastReleaseAt) : null,
      }))
    );
    for (const report of persisted.reports) {
      await runtime.reportStore.save(userId, {
        ...report,
        generatedAt: new Date(report.generatedAt),
      });
    }
    await runtime.repoReadmeStore.upsertMany(
      (persisted.readmes ?? []).map((readme) => ({
        repoId: readme.repoId,
        content: readme.content,
        fetchedAt: new Date(readme.fetchedAt),
      }))
    );

    if (persisted.connection) {
      runtime.connectionByUserId.set(userId, {
        githubLogin: persisted.connection.githubLogin,
        lastSyncedAt: new Date(persisted.connection.lastSyncedAt),
      });
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}

async function persistTestRuntimeState(
  runtime: {
    repoCatalogStore: InMemoryRepoCatalogStore;
    repoReadmeStore: InMemoryRepoReadmeStore;
    userRepoStateStore: InMemoryUserRepoStateStore;
    userNoteStore: InMemoryUserNoteStore;
    eventStore: InMemoryPortfolioEventStore;
    snapshotStore: InMemorySnapshotStore;
    reportStore: InMemoryReportSnapshotStore;
    connectionByUserId: Map<string, { githubLogin: string; lastSyncedAt: Date }>;
  },
  userId: string
) {
  await fs.mkdir(TEST_RUNTIME_STATE_DIR, { recursive: true });

  const states = await runtime.userRepoStateStore.listByUser(userId);
  const repositories = await runtime.repoCatalogStore.listByIds(states.map((state) => state.repoId));
  const notes = await runtime.userNoteStore.listByUser(userId);
  const events = await runtime.eventStore.listByUser(userId);
  const snapshots = await runtime.snapshotStore.listLatest(states.map((state) => state.repoId));
  const reports = await runtime.reportStore.listByUser(userId);
  const readmes = repositories
    .map((repo) => repo.id)
    .map((repoId) => runtime.repoReadmeStore.get(repoId));
  const connection = runtime.connectionByUserId.get(userId);
  const resolvedReadmes = await Promise.all(readmes);

  await fs.writeFile(
    getTestRuntimeStatePath(userId),
    JSON.stringify(
      {
        connection: connection
          ? {
              githubLogin: connection.githubLogin,
              lastSyncedAt: connection.lastSyncedAt.toISOString(),
            }
          : null,
        repositories,
        states: states.map((state) => ({
          ...state,
          starredAt: state.starredAt.toISOString(),
          lastTouchedAt: state.lastTouchedAt?.toISOString() ?? null,
          lastViewedAt: state.lastViewedAt?.toISOString() ?? null,
        })),
        notes: notes.map((note) => ({
          ...note,
          createdAt: note.createdAt.toISOString(),
          updatedAt: note.updatedAt.toISOString(),
        })),
        events: events.map((event) => ({
          ...event,
          occurredAt: event.occurredAt.toISOString(),
        })),
        snapshots: snapshots.map((snapshot) => ({
          ...snapshot,
          snapshotDate: snapshot.snapshotDate.toISOString(),
          pushedAt: snapshot.pushedAt?.toISOString() ?? null,
          lastReleaseAt: snapshot.lastReleaseAt?.toISOString() ?? null,
        })),
        reports: reports.map((report) => ({
          ...report,
          generatedAt: report.generatedAt.toISOString(),
        })),
        readmes: resolvedReadmes
          .filter((readme): readme is RepoReadme => Boolean(readme))
          .map((readme) => ({
            repoId: readme.repoId,
            content: readme.content,
            fetchedAt: readme.fetchedAt.toISOString(),
          })),
      },
      null,
      2
    ),
    "utf8"
  );
}

function getTestRuntime(): PortfolioRuntime {
  const globalScope = globalThis as typeof globalThis & {
    __gharsTestRuntime?: {
      repoCatalogStore: InMemoryRepoCatalogStore;
      repoReadmeStore: InMemoryRepoReadmeStore;
      userRepoStateStore: InMemoryUserRepoStateStore;
      userNoteStore: InMemoryUserNoteStore;
      eventStore: InMemoryPortfolioEventStore;
      snapshotStore: InMemorySnapshotStore;
      reportStore: InMemoryReportSnapshotStore;
      connectionByUserId: Map<string, { githubLogin: string; lastSyncedAt: Date }>;
    };
  };

  const runtime =
    globalScope.__gharsTestRuntime ??
    {
      repoCatalogStore: new InMemoryRepoCatalogStore(),
      repoReadmeStore: new InMemoryRepoReadmeStore(),
      userRepoStateStore: new InMemoryUserRepoStateStore(),
      userNoteStore: new InMemoryUserNoteStore(),
      eventStore: new InMemoryPortfolioEventStore(),
      snapshotStore: new InMemorySnapshotStore([...demoSnapshots]),
      reportStore: new InMemoryReportSnapshotStore(),
      connectionByUserId: new Map<string, { githubLogin: string; lastSyncedAt: Date }>(),
    };

  globalScope.__gharsTestRuntime = runtime;

  return {
    async importPortfolio(request) {
      await hydrateTestRuntimeState(runtime, request.userId);
      const stateByRepoId = new Map(demoStates.map((state) => [state.repoId, state.starredAt]));
      const github = {
        async listStarred() {
          return {
            edges: demoRepositories.map((repo) => ({
              repo,
              starredAt: stateByRepoId.get(repo.id) ?? new Date("2026-03-01T00:00:00.000Z"),
            })),
            nextCursor: null,
          };
        },
        async getRepo(fullName: string) {
          const repo = demoRepositories.find((entry) => entry.fullName === fullName);
          if (!repo) {
            throw new Error(`Missing fake repo: ${fullName}`);
          }
          return repo;
        },
        async getLatestRelease(fullName: string) {
          const repo = demoRepositories.find((entry) => entry.fullName === fullName);
          return repo?.lastReleaseAt ?? null;
        },
        async getReadme(fullName: string) {
          return {
            repoId: fullName.toLowerCase(),
            content: `# ${fullName}\n\nThis README explains how ${fullName} fits into a portfolio observability workflow and when to use it.`,
            fetchedAt: new Date("2026-03-11T00:00:00.000Z"),
          };
        },
      } satisfies GitHubGateway;
      const service = createImportStarredReposService({
        github,
        repoCatalogStore: runtime.repoCatalogStore,
        userRepoStateStore: runtime.userRepoStateStore,
        eventStore: runtime.eventStore,
        clock: new SystemClock(),
      });

      const result = await service(request.userId);
      runtime.connectionByUserId.set(request.userId, {
        githubLogin: request.githubLogin,
        lastSyncedAt: result.completedAt,
      });
      let portfolio = await loadPortfolioData({
        userId: request.userId,
        repoCatalogStore: runtime.repoCatalogStore,
        userRepoStateStore: runtime.userRepoStateStore,
        userNoteStore: runtime.userNoteStore,
      });
      portfolio = {
        ...portfolio,
        repositories: await hydrateRepoReadmes({
          repositories: portfolio.repositories,
          states: portfolio.states,
          repoCatalogStore: runtime.repoCatalogStore,
          repoReadmeStore: runtime.repoReadmeStore,
          github,
          limit: 8,
        }),
      };
      await persistDerivedArtifacts({
        userId: request.userId,
        githubLogin: request.githubLogin,
        lastSyncedAt: result.completedAt,
        repositories: portfolio.repositories,
        states: portfolio.states,
        notes: portfolio.notes,
        events: await runtime.eventStore.listByUser(request.userId),
        snapshotStore: runtime.snapshotStore,
        reportStore: runtime.reportStore,
      });
      await persistTestRuntimeState(runtime, request.userId);
      return result;
    },
    async addNote(request) {
      await hydrateTestRuntimeState(runtime, request.userId);
      const existingPortfolio = await loadPortfolioData({
        userId: request.userId,
        repoCatalogStore: runtime.repoCatalogStore,
        userRepoStateStore: runtime.userRepoStateStore,
        userNoteStore: runtime.userNoteStore,
      });
      const repoId =
        existingPortfolio.repositories.find(
          (repo) => repo.fullName.toLowerCase() === request.repoFullName.toLowerCase()
        )?.id ?? request.repoFullName.toLowerCase();
      const note = await createAddUserNoteService({
        noteStore: runtime.userNoteStore,
        stateStore: runtime.userRepoStateStore,
        eventStore: runtime.eventStore,
        clock: new SystemClock(),
      })({
        noteId: crypto.randomUUID(),
        userId: request.userId,
        repoId,
        content: request.content,
      });

      const portfolio = await loadPortfolioData({
        userId: request.userId,
        repoCatalogStore: runtime.repoCatalogStore,
        userRepoStateStore: runtime.userRepoStateStore,
        userNoteStore: runtime.userNoteStore,
      });
      await persistDerivedArtifacts({
        userId: request.userId,
        githubLogin: runtime.connectionByUserId.get(request.userId)?.githubLogin ?? null,
        lastSyncedAt: runtime.connectionByUserId.get(request.userId)?.lastSyncedAt ?? null,
        repositories: portfolio.repositories,
        states: portfolio.states,
        notes: portfolio.notes,
        events: await runtime.eventStore.listByUser(request.userId),
        snapshotStore: runtime.snapshotStore,
        reportStore: runtime.reportStore,
      });
      await persistTestRuntimeState(runtime, request.userId);

      return note;
    },
    async changeRepoState(request) {
      await hydrateTestRuntimeState(runtime, request.userId);
      const existingPortfolio = await loadPortfolioData({
        userId: request.userId,
        repoCatalogStore: runtime.repoCatalogStore,
        userRepoStateStore: runtime.userRepoStateStore,
        userNoteStore: runtime.userNoteStore,
      });
      const repoId =
        existingPortfolio.repositories.find(
          (repo) => repo.fullName.toLowerCase() === request.repoFullName.toLowerCase()
        )?.id ?? request.repoFullName.toLowerCase();
      const state = await createChangeRepoStateService({
        stateStore: runtime.userRepoStateStore,
        eventStore: runtime.eventStore,
        clock: new SystemClock(),
      })({
        userId: request.userId,
        repoId,
        nextState: request.nextState,
      });

      const portfolio = await loadPortfolioData({
        userId: request.userId,
        repoCatalogStore: runtime.repoCatalogStore,
        userRepoStateStore: runtime.userRepoStateStore,
        userNoteStore: runtime.userNoteStore,
      });
      await persistDerivedArtifacts({
        userId: request.userId,
        githubLogin: runtime.connectionByUserId.get(request.userId)?.githubLogin ?? null,
        lastSyncedAt: runtime.connectionByUserId.get(request.userId)?.lastSyncedAt ?? null,
        repositories: portfolio.repositories,
        states: portfolio.states,
        notes: portfolio.notes,
        events: await runtime.eventStore.listByUser(request.userId),
        snapshotStore: runtime.snapshotStore,
        reportStore: runtime.reportStore,
      });
      await persistTestRuntimeState(runtime, request.userId);

      return state;
    },
    async getDashboardModel(userId) {
      await hydrateTestRuntimeState(runtime, userId);
      const { repositories, states, notes } = await loadPortfolioData({
        userId,
        repoCatalogStore: runtime.repoCatalogStore,
        userRepoStateStore: runtime.userRepoStateStore,
        userNoteStore: runtime.userNoteStore,
      });
      return buildDashboardModel({
        repositories,
        states,
        notes,
        githubLogin: runtime.connectionByUserId.get(userId)?.githubLogin ?? null,
        lastSyncedAt: runtime.connectionByUserId.get(userId)?.lastSyncedAt ?? null,
      });
    },
    async getSearchModel(userId) {
      await hydrateTestRuntimeState(runtime, userId);
      const { repositories, states, notes } = await loadPortfolioData({
        userId,
        repoCatalogStore: runtime.repoCatalogStore,
        userRepoStateStore: runtime.userRepoStateStore,
        userNoteStore: runtime.userNoteStore,
      });
      return buildSearchModel({
        repositories,
        states,
        notes,
        githubLogin: runtime.connectionByUserId.get(userId)?.githubLogin ?? null,
      });
    },
    async getRepoDetailModel(userId, owner, name) {
      await hydrateTestRuntimeState(runtime, userId);
      const { repositories, states, notes } = await loadPortfolioData({
        userId,
        repoCatalogStore: runtime.repoCatalogStore,
        userRepoStateStore: runtime.userRepoStateStore,
        userNoteStore: runtime.userNoteStore,
      });
      const snapshots = await runtime.snapshotStore.listLatest(states.map((state) => state.repoId));
      return buildRepoDetailModel({
        owner,
        name,
        repositories,
        states,
        notes,
        snapshots,
        readmeStore: runtime.repoReadmeStore,
        githubLogin: runtime.connectionByUserId.get(userId)?.githubLogin ?? null,
      });
    },
    async getAnalyticsModel(userId) {
      await hydrateTestRuntimeState(runtime, userId);
      const { repositories, states, notes } = await loadPortfolioData({
        userId,
        repoCatalogStore: runtime.repoCatalogStore,
        userRepoStateStore: runtime.userRepoStateStore,
        userNoteStore: runtime.userNoteStore,
      });
      const events = await runtime.eventStore.listByUser(userId);
      const snapshots = await runtime.snapshotStore.listLatest(states.map((state) => state.repoId));
      return await buildAnalyticsModel({
        repositories,
        states,
        notes,
        events,
        snapshots,
        githubLogin: runtime.connectionByUserId.get(userId)?.githubLogin ?? null,
      });
    },
    async getReportsModel(userId) {
      await hydrateTestRuntimeState(runtime, userId);
      const { repositories, states } = await loadPortfolioData({
        userId,
        repoCatalogStore: runtime.repoCatalogStore,
        userRepoStateStore: runtime.userRepoStateStore,
        userNoteStore: runtime.userNoteStore,
      });
      const reports = await runtime.reportStore.listByUser(userId);
      return buildReportsModel({
        repositories,
        reports,
        githubLogin: runtime.connectionByUserId.get(userId)?.githubLogin ?? null,
        lastSyncedAt: runtime.connectionByUserId.get(userId)?.lastSyncedAt ?? null,
        hasImport: states.length > 0,
      });
    },
  };
}

function getConvexRuntime(): PortfolioRuntime {
  if (!appEnv.NEXT_PUBLIC_CONVEX_URL) {
    throw new Error("Convex URL is not configured");
  }

  const client = new ConvexHttpClient(appEnv.NEXT_PUBLIC_CONVEX_URL);
  const repoCatalogStore = new ConvexRepoCatalogStore(client);
  const repoReadmeStore = new ConvexRepoReadmeStore(client);
  const userRepoStateStore = new ConvexUserRepoStateStore(client);
  const userNoteStore = new ConvexUserNoteStore(client);
  const eventStore = new ConvexPortfolioEventStore(client);
  const snapshotStore = new ConvexSnapshotStore(client);
  const reportStore = new ConvexReportSnapshotStore(client);
  const clock = new SystemClock();

  async function loadConnection(userId: string) {
    return await client.query(api.portfolio.getGitHubConnection, {
      authUserId: userId,
    });
  }

  async function loadConnectionWithAccessToken(userId: string) {
    return await client.query(api.portfolio.getGitHubConnectionWithAccessToken, {
      authUserId: userId,
    });
  }

  return {
    async importPortfolio(request) {
      const github = new GitHubApiGateway(request.accessToken);
      const service = createImportStarredReposService({
        github,
        repoCatalogStore,
        userRepoStateStore,
        eventStore,
        clock,
      });

      const result = await service(request.userId);
      await client.mutation(api.portfolio.upsertGitHubConnection, {
        authUserId: request.userId,
        githubUserId: request.githubUserId,
        githubLogin: request.githubLogin,
        accessToken: request.accessToken,
        scopes: [],
        lastSyncedAt: result.completedAt.getTime(),
      });
      let portfolio = await loadPortfolioData({
        userId: request.userId,
        repoCatalogStore,
        userRepoStateStore,
        userNoteStore,
      });
      portfolio = {
        ...portfolio,
        repositories: await hydrateRepoReadmes({
          repositories: portfolio.repositories,
          states: portfolio.states,
          repoCatalogStore,
          repoReadmeStore,
          github,
          limit: 16,
        }),
      };
      await persistDerivedArtifacts({
        userId: request.userId,
        githubLogin: request.githubLogin,
        lastSyncedAt: result.completedAt,
        repositories: portfolio.repositories,
        states: portfolio.states,
        notes: portfolio.notes,
        events: await eventStore.listByUser(request.userId),
        snapshotStore,
        reportStore,
      });
      return result;
    },
    async addNote(request) {
      const existingPortfolio = await loadPortfolioData({
        userId: request.userId,
        repoCatalogStore,
        userRepoStateStore,
        userNoteStore,
      });
      const repoId =
        existingPortfolio.repositories.find(
          (repo) => repo.fullName.toLowerCase() === request.repoFullName.toLowerCase()
        )?.id ?? request.repoFullName.toLowerCase();
      const note = await createAddUserNoteService({
        noteStore: userNoteStore,
        stateStore: userRepoStateStore,
        eventStore,
        clock,
      })({
        noteId: crypto.randomUUID(),
        userId: request.userId,
        repoId,
        content: request.content,
      });
      const portfolio = await loadPortfolioData({
        userId: request.userId,
        repoCatalogStore,
        userRepoStateStore,
        userNoteStore,
      });
      const connection = await loadConnection(request.userId);
      await persistDerivedArtifacts({
        userId: request.userId,
        githubLogin: connection?.githubLogin ?? null,
        lastSyncedAt: connection?.lastSyncedAt ? new Date(connection.lastSyncedAt) : null,
        repositories: portfolio.repositories,
        states: portfolio.states,
        notes: portfolio.notes,
        events: await eventStore.listByUser(request.userId),
        snapshotStore,
        reportStore,
      });
      return note;
    },
    async changeRepoState(request) {
      const existingPortfolio = await loadPortfolioData({
        userId: request.userId,
        repoCatalogStore,
        userRepoStateStore,
        userNoteStore,
      });
      const repoId =
        existingPortfolio.repositories.find(
          (repo) => repo.fullName.toLowerCase() === request.repoFullName.toLowerCase()
        )?.id ?? request.repoFullName.toLowerCase();
      const state = await createChangeRepoStateService({
        stateStore: userRepoStateStore,
        eventStore,
        clock,
      })({
        userId: request.userId,
        repoId,
        nextState: request.nextState,
      });
      const portfolio = await loadPortfolioData({
        userId: request.userId,
        repoCatalogStore,
        userRepoStateStore,
        userNoteStore,
      });
      const connection = await loadConnection(request.userId);
      await persistDerivedArtifacts({
        userId: request.userId,
        githubLogin: connection?.githubLogin ?? null,
        lastSyncedAt: connection?.lastSyncedAt ? new Date(connection.lastSyncedAt) : null,
        repositories: portfolio.repositories,
        states: portfolio.states,
        notes: portfolio.notes,
        events: await eventStore.listByUser(request.userId),
        snapshotStore,
        reportStore,
      });
      return state;
    },
    async getDashboardModel(userId) {
      const { repositories, states, notes } = await loadPortfolioData({
        userId,
        repoCatalogStore,
        userRepoStateStore,
        userNoteStore,
      });
      const connection = await loadConnection(userId);

      return buildDashboardModel({
        repositories,
        states,
        notes,
        githubLogin: connection?.githubLogin ?? null,
        lastSyncedAt: connection?.lastSyncedAt ? new Date(connection.lastSyncedAt) : null,
      });
    },
    async getSearchModel(userId) {
      const { repositories, states, notes } = await loadPortfolioData({
        userId,
        repoCatalogStore,
        userRepoStateStore,
        userNoteStore,
      });
      const connection = await loadConnection(userId);

      return buildSearchModel({
        repositories,
        states,
        notes,
        githubLogin: connection?.githubLogin ?? null,
      });
    },
    async getRepoDetailModel(userId, owner, name) {
      const { repositories, states, notes } = await loadPortfolioData({
        userId,
        repoCatalogStore,
        userRepoStateStore,
        userNoteStore,
      });
      const connection = await loadConnection(userId);
      const connectionWithAccessToken = await loadConnectionWithAccessToken(userId);
      const snapshots = await snapshotStore.listLatest(states.map((state) => state.repoId));
      const enrichedRepo = await hydrateRepoReadmeOnDemand({
        repo:
          repositories.find(
            (candidate) => candidate.fullName.toLowerCase() === `${owner}/${name}`.toLowerCase()
          ) ?? null,
        accessToken: connectionWithAccessToken?.accessToken ?? null,
        repoCatalogStore,
        repoReadmeStore,
      });
      const nextRepositories = enrichedRepo
        ? repositories.map((repo) => (repo.id === enrichedRepo.id ? enrichedRepo : repo))
        : repositories;

      return buildRepoDetailModel({
        owner,
        name,
        repositories: nextRepositories,
        states,
        notes,
        snapshots,
        readmeStore: repoReadmeStore,
        githubLogin: connection?.githubLogin ?? null,
      });
    },
    async getAnalyticsModel(userId) {
      const { repositories, states, notes } = await loadPortfolioData({
        userId,
        repoCatalogStore,
        userRepoStateStore,
        userNoteStore,
      });
      const connection = await loadConnection(userId);
      const events = await eventStore.listByUser(userId);
      const snapshots = await snapshotStore.listLatest(states.map((state) => state.repoId));

      return await buildAnalyticsModel({
        repositories,
        states,
        notes,
        events,
        snapshots,
        githubLogin: connection?.githubLogin ?? null,
      });
    },
    async getReportsModel(userId) {
      const { repositories, states } = await loadPortfolioData({
        userId,
        repoCatalogStore,
        userRepoStateStore,
        userNoteStore,
      });
      const connection = await loadConnection(userId);
      const reports = await reportStore.listByUser(userId);

      return buildReportsModel({
        repositories,
        reports,
        githubLogin: connection?.githubLogin ?? null,
        lastSyncedAt: connection?.lastSyncedAt ? new Date(connection.lastSyncedAt) : null,
        hasImport: states.length > 0,
      });
    },
  };
}

async function loadPortfolioData(input: {
  userId: string;
  repoCatalogStore: RepoCatalogStore;
  userRepoStateStore: UserRepoStateStore;
  userNoteStore: UserNoteStore;
}) {
  const states = await input.userRepoStateStore.listByUser(input.userId);
  const repositories = await input.repoCatalogStore.listByIds(states.map((state) => state.repoId));
  const notes = await input.userNoteStore.listByUser(input.userId);

  return {
    repositories,
    states,
    notes,
  };
}

function buildDashboardModel(input: {
  repositories: RepoCatalog[];
  states: UserRepoState[];
  notes: UserNote[];
  githubLogin: string | null;
  lastSyncedAt: Date | null;
}): PortfolioDashboardModel {
  const metrics = buildOverviewMetrics({
    now: new Date(),
    repositories: input.repositories,
    states: input.states,
    notes: input.notes,
  });
  const repoById = new Map(input.repositories.map((repo) => [repo.id, repo]));

  const recentRepos = [...input.states]
    .sort((left, right) => right.starredAt.getTime() - left.starredAt.getTime())
    .flatMap((state) => {
      const repo = repoById.get(state.repoId);
      if (!repo) {
        return [];
      }

      return [
        {
          fullName: repo.fullName,
          description: repo.description,
          language: repo.language,
          topics: repo.topics,
          state: state.state,
          starredAt: state.starredAt,
          noteCount: state.noteCount,
          stars: repo.stargazerCount,
        },
      ];
    })
    .slice(0, 8);

  return {
    metrics,
    recentRepos,
    lastSyncedAt: input.lastSyncedAt,
    githubLogin: input.githubLogin,
    hasImport: input.states.length > 0,
  };
}

function buildSearchModel(input: {
  repositories: RepoCatalog[];
  states: UserRepoState[];
  notes: UserNote[];
  githubLogin: string | null;
}): PortfolioSearchModel {
  const statesByName = input.states.map((state) => {
    const repo = input.repositories.find((entry) => entry.id === state.repoId);
    return { state, repo };
  });

  const countByState = {
    started: input.states.filter((state) => state.state === "started").length,
    watching: input.states.filter((state) => state.state === "watching").length,
    parked: input.states.filter((state) => state.state === "parked").length,
    archived: statesByName.filter(({ repo }) => repo?.archived).length,
  };

  const topicCounts = new Map<string, number>();
  const languageCounts = new Map<string, number>();
  for (const repo of input.repositories) {
    for (const topic of repo.topics) {
      topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
    }
    if (repo.language) {
      languageCounts.set(repo.language, (languageCounts.get(repo.language) ?? 0) + 1);
    }
  }

  const topTopics = [...topicCounts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 3)
    .map(([topic]) => ({ label: topic, query: topic }));
  const topLanguages = [...languageCounts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 2)
    .map(([language]) => ({ label: language, query: language }));

  return {
    hasImport: input.states.length > 0,
    githubLogin: input.githubLogin,
    repositories: input.repositories,
    states: input.states,
    notes: input.notes,
    savedViews: [
      {
        id: "all",
        name: "All imported",
        description: "Everything in the current portfolio",
        count: input.states.length,
        query: "",
      },
      {
        id: "started",
        name: "Started",
        description: "Repos you moved into active work",
        count: countByState.started,
        query: "started",
        filters: { state: ["started"] },
      },
      {
        id: "watching",
        name: "Watching",
        description: "Repos you want to keep warm",
        count: countByState.watching,
        query: "watching",
        filters: { state: ["watching"] },
      },
      {
        id: "parked",
        name: "Parked",
        description: "Repos you explicitly set aside",
        count: countByState.parked,
        query: "parked",
        filters: { state: ["parked"] },
      },
      {
        id: "archived",
        name: "Archived",
        description: "Imported repos that are archived upstream",
        count: countByState.archived,
        query: "",
        filters: { archived: true },
      },
    ],
    quickQueries: [
      { label: "started", query: "started" },
      { label: "watching", query: "watching" },
      ...topTopics,
      ...topLanguages,
    ],
  };
}

async function buildRepoDetailModel(input: {
  owner: string;
  name: string;
  repositories: RepoCatalog[];
  states: UserRepoState[];
  notes: UserNote[];
  snapshots: RepoSnapshotDaily[];
  readmeStore: RepoReadmeStore;
  githubLogin: string | null;
}): Promise<PortfolioRepoDetailModel> {
  const fullName = `${input.owner}/${input.name}`.toLowerCase();
  const repo = input.repositories.find((entry) => entry.fullName.toLowerCase() === fullName) ?? null;
  const state = repo
    ? input.states.find((entry) => entry.repoId === repo.id) ?? null
    : null;
  const notes = repo ? input.notes.filter((entry) => entry.repoId === repo.id) : [];
  const readme = repo ? await input.readmeStore.get(repo.id) : null;
  const starHistory = repo
    ? input.snapshots
        .filter((snapshot) => snapshot.repoId === repo.id)
        .sort((left, right) => left.snapshotDate.getTime() - right.snapshotDate.getTime())
        .slice(-10)
        .map((snapshot) => ({
          capturedAt: snapshot.snapshotDate,
          stars: snapshot.stargazersCount,
          momentumScore: snapshot.momentumScore ?? null,
        }))
    : [];

  return {
    hasImport: input.states.length > 0,
    githubLogin: input.githubLogin,
    repo,
    state,
    notes,
    readme,
    starHistory,
  };
}

function buildAnalyticsModelSync(input: {
  repositories: RepoCatalog[];
  states: UserRepoState[];
  notes: UserNote[];
  events: PortfolioEvent[];
  snapshots: RepoSnapshotDaily[];
  githubLogin: string | null;
}): PortfolioAnalyticsModel {
  const now = new Date();
  const metrics = buildOverviewMetrics({
    now,
    repositories: input.repositories,
    states: input.states,
    notes: input.notes,
  });
  const drift = buildTemporalDrift({
    repositories: input.repositories,
    states: input.states,
  });
  const repoById = new Map(input.repositories.map((repo) => [repo.id, repo]));
  const noteCountByRepoId = new Map<string, number>();
  const stateByRepoId = new Map(input.states.map((state) => [state.repoId, state]));

  for (const note of input.notes) {
    noteCountByRepoId.set(note.repoId, (noteCountByRepoId.get(note.repoId) ?? 0) + 1);
  }

  const snapshotsByRepoId = buildSnapshotMap(input.snapshots);
  const momentum = input.states
    .flatMap((state) => {
      const repo = repoById.get(state.repoId);
      if (!repo) {
        return [];
      }

      const history = snapshotsByRepoId.get(repo.id) ?? [];
      const currentSnapshot =
        history[0] ??
        ({
          repoId: repo.id,
          snapshotDate: now,
          stargazersCount: repo.stargazerCount,
          forksCount: repo.forksCount,
          openIssuesCount: repo.openIssuesCount,
          pushedAt: repo.pushedAt ?? null,
          archived: repo.archived,
          lastReleaseAt: repo.lastReleaseAt ?? null,
          momentumScore: null,
          neglectScore: null,
        } satisfies RepoSnapshotDaily);
      const previousSnapshot = history[1] ?? null;

      return [
        computeMomentumScore({
          repo,
          currentSnapshot,
          previousSnapshot,
          now,
          userTouchCount14d: deriveUserTouchCount14d(state, now),
        }),
      ];
    })
    .sort((left, right) => right.score - left.score);

  const clusters = buildRepoClusters({
    repositories: input.repositories,
    states: input.states,
    momentum,
  });

  const topRepos = momentum.slice(0, 8).flatMap((entry) => {
    const repo = repoById.get(entry.repoId);
    const state = stateByRepoId.get(entry.repoId);
    if (!repo || !state) {
      return [];
    }

    return [
      {
        fullName: repo.fullName,
        language: repo.language,
        state: state.state,
        noteCount: noteCountByRepoId.get(repo.id) ?? 0,
        stars: repo.stargazerCount,
        lastTouchedAt: state.lastTouchedAt ?? null,
        pushedAt: repo.pushedAt,
        momentumScore: entry.score,
        starDelta7d: entry.starDelta7d,
        forkDelta30d: entry.forkDelta30d,
        trend: (snapshotsByRepoId.get(repo.id) ?? [])
          .slice(0, 8)
          .reverse()
          .map((snapshot) => snapshot.stargazersCount)
          .concat(
            (snapshotsByRepoId.get(repo.id) ?? []).length === 0 ||
              (snapshotsByRepoId.get(repo.id) ?? [])[0]?.stargazersCount !== repo.stargazerCount
              ? [repo.stargazerCount]
              : []
          ),
        reasons: buildMomentumReasons(entry),
        readmeSummary: repo.readmeSummary ?? null,
        readmeFetchedAt: repo.readmeFetchedAt ?? null,
      } satisfies PortfolioAnalyticsRepo,
    ];
  });

  const neglectSignals = generateNeglectSignals({
    now,
    states: input.states,
    notes: input.notes,
    events: input.events,
  });

  return {
    hasImport: input.states.length > 0,
    githubLogin: input.githubLogin,
    metrics,
    driftRows: toDriftRows(drift.series),
    clusters,
    constellationItems: topRepos.map((repo) => ({
      cluster:
        input.repositories.find((candidate) => candidate.fullName === repo.fullName)?.topics[0] ??
        input.repositories.find((candidate) => candidate.fullName === repo.fullName)?.language ??
        "uncategorized",
      importance: Math.max(60, Math.min(320, Math.round(repo.stars / 150))),
      momentum: repo.momentumScore,
    })),
    topRepos,
    coverage: buildCoverageMetrics({
      repositories: input.repositories,
      states: input.states,
      notes: input.notes,
      snapshots: input.snapshots,
    }),
    opportunities: buildOpportunityQueue({
      topRepos,
      repositories: input.repositories,
      states: input.states,
    }),
    neglectQueue: buildNeglectQueue({
      neglectSignals,
      repositories: input.repositories,
      states: input.states,
      noteCountByRepoId,
    }),
    recentActivity: buildRecentActivity({
      events: input.events,
      repositories: input.repositories,
    }),
  };
}

async function buildAnalyticsModel(input: {
  repositories: RepoCatalog[];
  states: UserRepoState[];
  notes: UserNote[];
  events: PortfolioEvent[];
  snapshots: RepoSnapshotDaily[];
  githubLogin: string | null;
}): Promise<PortfolioAnalyticsModel> {
  return buildAnalyticsModelSync(input);
}

function buildCoverageMetrics(input: {
  repositories: RepoCatalog[];
  states: UserRepoState[];
  notes: UserNote[];
  snapshots: RepoSnapshotDaily[];
}): PortfolioCoverageMetric[] {
  const total = Math.max(1, input.states.length);
  const noted = input.states.filter((state) => state.noteCount > 0).length;
  const curated = input.states.filter((state) => state.state !== "saved" || state.noteCount > 0).length;
  const readmeReady = input.repositories.filter((repo) => repo.readmeSummary || repo.readmeExcerpt).length;
  const snapshotted = new Set(input.snapshots.map((snapshot) => snapshot.repoId)).size;

  return [
    {
      id: "notes",
      label: "Notes coverage",
      count: noted,
      total,
      percentage: Math.round((noted / total) * 100),
      summary: "Repos with at least one personal note.",
    },
    {
      id: "curation",
      label: "Curated portfolio",
      count: curated,
      total,
      percentage: Math.round((curated / total) * 100),
      summary: "Repos you moved beyond a passive saved state.",
    },
    {
      id: "readmes",
      label: "README ready",
      count: readmeReady,
      total,
      percentage: Math.round((readmeReady / total) * 100),
      summary: "Repos enriched with upstream README context.",
    },
    {
      id: "snapshots",
      label: "Snapshot history",
      count: snapshotted,
      total,
      percentage: Math.round((snapshotted / total) * 100),
      summary: "Repos with at least one tracked refresh snapshot.",
    },
  ];
}

function buildOpportunityQueue(input: {
  topRepos: PortfolioAnalyticsRepo[];
  repositories: RepoCatalog[];
  states: UserRepoState[];
}): PortfolioAnalyticsOpportunity[] {
  const repoByName = new Map(input.repositories.map((repo) => [repo.fullName, repo]));
  const stateByRepoId = new Map(input.states.map((state) => [state.repoId, state]));

  return input.topRepos
    .filter((repo) => repo.state === "saved" && repo.noteCount === 0)
    .map((repo) => ({
      fullName: repo.fullName,
      state: repo.state,
      language: repo.language,
      momentumScore: repo.momentumScore,
      noteCount: repo.noteCount,
      starDelta7d: repo.starDelta7d,
      lastTouchedAt: stateByRepoId.get(repoByName.get(repo.fullName)?.id ?? "")?.lastTouchedAt ?? null,
      readmeSummary: repo.readmeSummary ?? null,
      reasons: [
        ...repo.reasons,
        repo.readmeSummary ? "readme ready" : "readme pending",
        "no personal note yet",
      ],
    }))
    .slice(0, 6);
}

function buildNeglectQueue(input: {
  neglectSignals: ReturnType<typeof generateNeglectSignals>;
  repositories: RepoCatalog[];
  states: UserRepoState[];
  noteCountByRepoId: Map<string, number>;
}): PortfolioAnalyticsNeglect[] {
  const repoById = new Map(input.repositories.map((repo) => [repo.id, repo]));
  const stateByRepoId = new Map(input.states.map((state) => [state.repoId, state]));

  return input.neglectSignals.slice(0, 6).flatMap((signal) => {
    const repo = repoById.get(signal.repoId);
    const state = stateByRepoId.get(signal.repoId);
    if (!repo || !state) {
      return [];
    }

    return [
      {
        fullName: repo.fullName,
        state: state.state,
        noteCount: input.noteCountByRepoId.get(repo.id) ?? 0,
        neglectScore: signal.score,
        lastTouchedAt: state.lastTouchedAt ?? null,
        reasons: signal.reasons,
      } satisfies PortfolioAnalyticsNeglect,
    ];
  });
}

function buildRecentActivity(input: {
  events: PortfolioEvent[];
  repositories: RepoCatalog[];
}): PortfolioAnalyticsActivity[] {
  const repoById = new Map(input.repositories.map((repo) => [repo.id, repo]));

  return [...input.events]
    .sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime())
    .slice(0, 8)
    .flatMap((event) => {
      const repo = repoById.get(event.repoId);
      if (!repo) {
        return [];
      }

      return [
        {
          id: event.id,
          repoFullName: repo.fullName,
          type: event.type,
          occurredAt: event.occurredAt,
          summary: describePortfolioEvent(event.type),
        } satisfies PortfolioAnalyticsActivity,
      ];
    });
}

function describePortfolioEvent(type: PortfolioEvent["type"]) {
  switch (type) {
    case "note_added":
      return "A note captured fresh context.";
    case "state_changed":
      return "State changed, signaling an intent shift.";
    case "repo_refreshed":
      return "Upstream metrics were refreshed.";
    case "start_session_started":
      return "You actively started working with it.";
    case "start_session_ended":
      return "A work session ended.";
    case "repo_starred":
      return "The repo entered your portfolio.";
    default:
      return "Portfolio activity recorded.";
  }
}

function buildReportsModel(input: {
  repositories: RepoCatalog[];
  reports: ReportSnapshot[];
  githubLogin: string | null;
  lastSyncedAt: Date | null;
  hasImport: boolean;
}): PortfolioReportsModel {
  const repoById = new Map(input.repositories.map((repo) => [repo.id, repo.fullName]));

  return {
    hasImport: input.hasImport,
    githubLogin: input.githubLogin,
    lastSyncedAt: input.lastSyncedAt,
    reports: input.reports.map((report) => ({
      id: report.id,
      title: report.period === "weekly" ? "Weekly live portfolio review" : "Monthly live portfolio review",
      period: report.period,
      generatedAt: report.generatedAt,
      summary: report.summary,
      sections: report.sections.map((section) => ({
        id: section.id,
        title: section.title,
        summary: section.summary,
        evidenceRepoNames: section.evidenceRepoIds
          .map((repoId) => repoById.get(repoId))
          .filter((value): value is string => Boolean(value)),
      })),
    })),
  };
}

function buildRepoClusters(input: {
  repositories: RepoCatalog[];
  states: UserRepoState[];
  momentum: { repoId: string; score: number }[];
}) {
  const repoClusters = buildRuntimeRepoClusters({
    repositories: input.repositories,
    states: input.states,
  });
  const repoById = new Map(input.repositories.map((repo) => [repo.id, repo]));
  const momentumByRepoId = new Map(input.momentum.map((entry) => [entry.repoId, entry.score]));

  return repoClusters
    .map((cluster) => {
      const averageMomentum =
        cluster.repoIds.reduce((total, repoId) => total + (momentumByRepoId.get(repoId) ?? 0), 0) /
        Math.max(1, cluster.repoIds.length);

      return {
        id: cluster.id,
        label: cluster.label,
        repoCount: cluster.repoIds.length,
        averageMomentum: Number(averageMomentum.toFixed(2)),
        topRepoNames: cluster.repoIds
          .map((repoId) => repoById.get(repoId)?.fullName)
          .filter((value): value is string => Boolean(value))
          .slice(0, 3),
      } satisfies PortfolioAnalyticsCluster;
    })
    .sort((left, right) => right.averageMomentum - left.averageMomentum || right.repoCount - left.repoCount);
}

function toDriftRows(series: { label: string; topic: string; count: number }[]): PortfolioAnalyticsDriftRow[] {
  const rows = new Map<string, PortfolioAnalyticsDriftRow>();

  for (const point of series) {
    const row = rows.get(point.label) ?? { month: point.label };
    row[point.topic] = point.count;
    rows.set(point.label, row);
  }

  return [...rows.values()].sort((left, right) => String(left.month).localeCompare(String(right.month)));
}

function buildMomentumReasons(input: {
  score: number;
  pushRecency: number;
  releaseRecency: number;
  userTouch14d: number;
}) {
  const reasons: string[] = [];

  if (input.userTouch14d > 0.6) {
    reasons.push("recently touched");
  }
  if (input.pushRecency > 0.6) {
    reasons.push("fresh upstream commits");
  }
  if (input.releaseRecency > 0.6) {
    reasons.push("recent release");
  }
  if (reasons.length === 0) {
    reasons.push(`score ${input.score.toFixed(2)}`);
  }

  return reasons;
}

export function getPortfolioRuntime(): PortfolioRuntime {
  if (appEnv.E2E_TEST_MODE) {
    return getTestRuntime();
  }

  return getConvexRuntime();
}

export function resetTestPortfolioRuntime() {
  const globalScope = globalThis as typeof globalThis & {
    __gharsTestRuntime?: unknown;
  };

  delete globalScope.__gharsTestRuntime;
  rmSync(TEST_RUNTIME_STATE_DIR, { recursive: true, force: true });
}
