import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type {
  GitHubStarPage,
  OverviewMetrics,
  PortfolioEvent,
  RepoCatalog,
  SearchFilters,
  UserNote,
  UserRepoState,
} from "@/lib/domain/types";
import { demoRepositories, demoStates } from "@/lib/demo/portfolio";
import { appEnv } from "@/lib/env/app-env";
import type {
  Clock,
  PortfolioEventStore,
  RepoCatalogStore,
  UserNoteStore,
  UserRepoStateStore,
} from "@/lib/ports";
import { buildOverviewMetrics, createImportStarredReposService } from "@/lib/services";
import { GitHubApiGateway } from "@/lib/adapters/github/githubApiGateway";

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
};

type ImportRequest = {
  userId: string;
  githubUserId: string;
  githubLogin: string;
  accessToken: string;
};

type PortfolioRuntime = {
  importPortfolio(request: ImportRequest): Promise<{ imported: number; completedAt: Date }>;
  getDashboardModel(userId: string): Promise<PortfolioDashboardModel>;
  getSearchModel(userId: string): Promise<PortfolioSearchModel>;
  getRepoDetailModel(userId: string, owner: string, name: string): Promise<PortfolioRepoDetailModel>;
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
      createdAt: repo.createdAt ? new Date(repo.createdAt) : null,
      updatedAt: repo.updatedAt ? new Date(repo.updatedAt) : null,
    }));
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
    await this.upsertStarEdges(state.userId, [{ repo: { fullName: state.repoId } as RepoCatalog, starredAt: state.starredAt }], state.lastTouchedAt ?? state.starredAt);
    await this.client.mutation(api.portfolio.changeRepoState, {
      authUserId: state.userId,
      repoFullName: state.repoId,
      state: state.state,
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
            : undefined,
        payload: event.payload,
      })),
    });
  }

  async listByUser() {
    return [];
  }
}

function getTestRuntime(): PortfolioRuntime {
  const globalScope = globalThis as typeof globalThis & {
    __gharsTestRuntime?: {
      repoCatalogStore: InMemoryRepoCatalogStore;
      userRepoStateStore: InMemoryUserRepoStateStore;
      userNoteStore: InMemoryUserNoteStore;
      eventStore: InMemoryPortfolioEventStore;
      connectionByUserId: Map<string, { githubLogin: string; lastSyncedAt: Date }>;
    };
  };

  const runtime =
    globalScope.__gharsTestRuntime ??
    {
      repoCatalogStore: new InMemoryRepoCatalogStore(),
      userRepoStateStore: new InMemoryUserRepoStateStore(),
      userNoteStore: new InMemoryUserNoteStore(),
      eventStore: new InMemoryPortfolioEventStore(),
      connectionByUserId: new Map<string, { githubLogin: string; lastSyncedAt: Date }>(),
    };

  globalScope.__gharsTestRuntime = runtime;

  return {
    async importPortfolio(request) {
      const stateByRepoId = new Map(demoStates.map((state) => [state.repoId, state.starredAt]));
      const service = createImportStarredReposService({
        github: {
          async listStarred() {
            return {
              edges: demoRepositories.map((repo) => ({
                repo,
                starredAt: stateByRepoId.get(repo.id) ?? new Date("2026-03-01T00:00:00.000Z"),
              })),
              nextCursor: null,
            };
          },
          async getRepo(fullName) {
            const repo = demoRepositories.find((entry) => entry.fullName === fullName);
            if (!repo) {
              throw new Error(`Missing fake repo: ${fullName}`);
            }
            return repo;
          },
          async getLatestRelease(fullName) {
            const repo = demoRepositories.find((entry) => entry.fullName === fullName);
            return repo?.lastReleaseAt ?? null;
          },
        },
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
      return result;
    },
    async getDashboardModel(userId) {
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
      const { repositories, states, notes } = await loadPortfolioData({
        userId,
        repoCatalogStore: runtime.repoCatalogStore,
        userRepoStateStore: runtime.userRepoStateStore,
        userNoteStore: runtime.userNoteStore,
      });
      return buildRepoDetailModel({
        owner,
        name,
        repositories,
        states,
        notes,
        githubLogin: runtime.connectionByUserId.get(userId)?.githubLogin ?? null,
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
  const userRepoStateStore = new ConvexUserRepoStateStore(client);
  const userNoteStore = new ConvexUserNoteStore(client);
  const eventStore = new ConvexPortfolioEventStore(client);
  const clock = new SystemClock();

  return {
    async importPortfolio(request) {
      const service = createImportStarredReposService({
        github: new GitHubApiGateway(request.accessToken),
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
      return result;
    },
    async getDashboardModel(userId) {
      const { repositories, states, notes } = await loadPortfolioData({
        userId,
        repoCatalogStore,
        userRepoStateStore,
        userNoteStore,
      });
      const connection = await client.query(api.portfolio.getGitHubConnection, {
        authUserId: userId,
      });

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
      const connection = await client.query(api.portfolio.getGitHubConnection, {
        authUserId: userId,
      });

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
      const connection = await client.query(api.portfolio.getGitHubConnection, {
        authUserId: userId,
      });

      return buildRepoDetailModel({
        owner,
        name,
        repositories,
        states,
        notes,
        githubLogin: connection?.githubLogin ?? null,
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

function buildRepoDetailModel(input: {
  owner: string;
  name: string;
  repositories: RepoCatalog[];
  states: UserRepoState[];
  notes: UserNote[];
  githubLogin: string | null;
}): PortfolioRepoDetailModel {
  const fullName = `${input.owner}/${input.name}`.toLowerCase();
  const repo = input.repositories.find((entry) => entry.fullName.toLowerCase() === fullName) ?? null;
  const state = repo
    ? input.states.find((entry) => entry.repoId === repo.id) ?? null
    : null;
  const notes = repo ? input.notes.filter((entry) => entry.repoId === repo.id) : [];

  return {
    hasImport: input.states.length > 0,
    githubLogin: input.githubLogin,
    repo,
    state,
    notes,
  };
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
}
