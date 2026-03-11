import { describe, expect, it } from "vitest";
import type { RepoCatalog, RepoCluster, RepoSnapshotDaily, UserRepoState } from "../../lib/domain/types";
import {
  buildClusterNarratives,
  buildConstellationLayout,
  buildOverviewMetrics,
  buildTemporalDrift,
  computeMomentumScore,
  createAddUserNoteService,
  createChangeRepoStateService,
  createImportStarredReposService,
  generateNeglectSignals,
  generateReport,
  searchPortfolio,
} from "../../lib/services";
import {
  FixedClock,
  InMemoryAiGateway,
  InMemoryGitHubGateway,
  InMemoryPortfolioEventStore,
  InMemoryRepoCatalogStore,
  InMemoryUserNoteStore,
  InMemoryUserRepoStateStore,
} from "./fakes";

const now = new Date("2026-03-11T12:00:00.000Z");

function buildRepo(overrides: Partial<RepoCatalog> = {}): RepoCatalog {
  return {
    id: overrides.id ?? "repo-1",
    fullName: overrides.fullName ?? "apify/crawlee",
    owner: overrides.owner ?? "apify",
    name: overrides.name ?? "crawlee",
    description: overrides.description ?? "Browser automation for data extraction",
    url: overrides.url ?? "https://github.com/apify/crawlee",
    homepage: overrides.homepage ?? "https://crawlee.dev",
    topics: overrides.topics ?? ["automation", "scraping"],
    language: overrides.language ?? "TypeScript",
    stargazerCount: overrides.stargazerCount ?? 22000,
    forksCount: overrides.forksCount ?? 1200,
    openIssuesCount: overrides.openIssuesCount ?? 180,
    pushedAt: overrides.pushedAt ?? new Date("2026-03-10T00:00:00.000Z"),
    archived: overrides.archived ?? false,
    isFork: overrides.isFork ?? false,
    lastReleaseAt: overrides.lastReleaseAt ?? new Date("2026-03-05T00:00:00.000Z"),
    createdAt: overrides.createdAt ?? new Date("2020-01-01T00:00:00.000Z"),
    updatedAt: overrides.updatedAt ?? new Date("2026-03-11T00:00:00.000Z"),
  };
}

function buildState(overrides: Partial<UserRepoState> = {}): UserRepoState {
  return {
    userId: overrides.userId ?? "user-1",
    repoId: overrides.repoId ?? "repo-1",
    state: overrides.state ?? "saved",
    starredAt: overrides.starredAt ?? new Date("2026-03-01T00:00:00.000Z"),
    tags: overrides.tags ?? [],
    noteCount: overrides.noteCount ?? 0,
    lastTouchedAt: overrides.lastTouchedAt ?? new Date("2026-03-02T00:00:00.000Z"),
    lastViewedAt: overrides.lastViewedAt ?? null,
  };
}

describe("portfolio services", () => {
  it("imports starred repos into catalog and user state stores", async () => {
    const repoCatalogStore = new InMemoryRepoCatalogStore();
    const userRepoStateStore = new InMemoryUserRepoStateStore();
    const eventStore = new InMemoryPortfolioEventStore();
    const service = createImportStarredReposService({
      github: new InMemoryGitHubGateway([
        {
          edges: [
            { repo: buildRepo(), starredAt: new Date("2026-03-01T00:00:00.000Z") },
            {
              repo: buildRepo({
                id: "repo-2",
                fullName: "vercel/ai",
                owner: "vercel",
                name: "ai",
                topics: ["ai", "sdk"],
              }),
              starredAt: new Date("2026-03-02T00:00:00.000Z"),
            },
          ],
          nextCursor: null,
        },
      ]),
      repoCatalogStore,
      userRepoStateStore,
      eventStore,
      clock: new FixedClock(now),
    });

    const result = await service("user-1");

    expect(result.imported).toBe(2);
    expect(repoCatalogStore.records.size).toBe(2);
    expect((await userRepoStateStore.listByUser("user-1")).length).toBe(2);
    expect(eventStore.events).toHaveLength(2);
  });

  it("adds a note and increments state note count", async () => {
    const noteStore = new InMemoryUserNoteStore();
    const stateStore = new InMemoryUserRepoStateStore();
    const eventStore = new InMemoryPortfolioEventStore();
    await stateStore.save(buildState());

    const service = createAddUserNoteService({
      noteStore,
      stateStore,
      eventStore,
      clock: new FixedClock(now),
    });

    const note = await service({
      noteId: "note-1",
      userId: "user-1",
      repoId: "repo-1",
      content: "Worth trying for GitHub refresh jobs",
    });

    expect(noteStore.notes).toHaveLength(1);
    expect(note.content).toContain("GitHub refresh");
    expect((await stateStore.get("user-1", "repo-1"))?.noteCount).toBe(1);
    expect(eventStore.events[0]?.type).toBe("note_added");
  });

  it("changes repo state and writes an event", async () => {
    const stateStore = new InMemoryUserRepoStateStore();
    const eventStore = new InMemoryPortfolioEventStore();
    await stateStore.save(buildState());

    const service = createChangeRepoStateService({
      stateStore,
      eventStore,
      clock: new FixedClock(now),
    });

    const updated = await service({
      userId: "user-1",
      repoId: "repo-1",
      nextState: "started",
    });

    expect(updated.state).toBe("started");
    expect(eventStore.events[0]?.payload).toEqual({ from: "saved", to: "started" });
  });

  it("searches portfolio by repo metadata, notes, and tags", () => {
    const repo = buildRepo();
    const results = searchPortfolio({
      query: "refresh",
      repositories: [repo],
      userStates: [buildState({ tags: ["refresh-jobs"] })],
      notes: [
        {
          id: "note-1",
          userId: "user-1",
          repoId: "repo-1",
          content: "Need refresh orchestration ideas",
          createdAt: now,
          updatedAt: now,
        },
      ],
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.reasons).toContain("note");
    expect(results[0]?.reasons).toContain("tag");
  });

  it("builds overview metrics and temporal drift", () => {
    const repos = [
      buildRepo(),
      buildRepo({
        id: "repo-2",
        fullName: "openai/openai-node",
        owner: "openai",
        name: "openai-node",
        topics: ["ai", "sdk"],
        language: "TypeScript",
      }),
    ];
    const states = [
      buildState({ state: "started", starredAt: new Date("2026-01-02T00:00:00.000Z") }),
      buildState({
        repoId: "repo-2",
        state: "watching",
        starredAt: new Date("2026-03-02T00:00:00.000Z"),
      }),
    ];

    const metrics = buildOverviewMetrics({
      now,
      repositories: repos,
      states,
      notes: [
        {
          id: "note-1",
          userId: "user-1",
          repoId: "repo-1",
          content: "Keep watching",
          createdAt: now,
          updatedAt: now,
        },
      ],
    });
    const drift = buildTemporalDrift({ repositories: repos, states });

    expect(metrics.startedCount).toBe(1);
    expect(metrics.watchingCount).toBe(1);
    expect(metrics.topTopics[0]?.count).toBeGreaterThan(0);
    expect(drift.series).toHaveLength(2);
    expect(drift.risingTopics[0]?.topic).toBe("ai");
  });

  it("computes momentum and neglect signals", () => {
    const repo = buildRepo();
    const previousSnapshot: RepoSnapshotDaily = {
      repoId: "repo-1",
      snapshotDate: new Date("2026-03-04T00:00:00.000Z"),
      stargazersCount: 21950,
      forksCount: 1180,
      openIssuesCount: 170,
      pushedAt: new Date("2026-03-03T00:00:00.000Z"),
      archived: false,
      lastReleaseAt: new Date("2026-02-28T00:00:00.000Z"),
    };
    const currentSnapshot: RepoSnapshotDaily = {
      ...previousSnapshot,
      snapshotDate: new Date("2026-03-11T00:00:00.000Z"),
      stargazersCount: 22020,
      forksCount: 1200,
    };
    const momentum = computeMomentumScore({
      repo,
      previousSnapshot,
      currentSnapshot,
      userTouchCount14d: 3,
      now,
    });
    const neglect = generateNeglectSignals({
      now,
      states: [buildState({ state: "started", lastTouchedAt: new Date("2026-01-01T00:00:00.000Z") })],
      notes: [
        {
          id: "note-1",
          userId: "user-1",
          repoId: "repo-1",
          content: "Still useful",
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      ],
      events: [],
    });

    expect(momentum.starDelta7d).toBe(70);
    expect(momentum.score).toBeGreaterThan(24);
    expect(neglect[0]?.reasons).toContain("started but quiet");
  });

  it("builds cluster narratives, constellation layout, and reports", async () => {
    const repos = [
      buildRepo(),
      buildRepo({
        id: "repo-2",
        fullName: "openai/openai-node",
        owner: "openai",
        name: "openai-node",
        topics: ["ai", "sdk"],
      }),
    ];
    const clusters: RepoCluster[] = [
      {
        id: "cluster-automation",
        label: "Automation",
        repoIds: ["repo-1", "repo-2"],
        topicSeed: "automation",
        languageSeed: "TypeScript",
      },
    ];
    const momentum = [
      { repoId: "repo-1", score: 3.2, starDelta7d: 5, forkDelta30d: 2, pushRecency: 0.8, releaseRecency: 0.6, userTouch14d: 0.4 },
      { repoId: "repo-2", score: 1.4, starDelta7d: 2, forkDelta30d: 1, pushRecency: 0.5, releaseRecency: 0.5, userTouch14d: 0.2 },
    ];

    const narratives = await buildClusterNarratives({
      clusters,
      repositories: repos,
      momentumByRepoId: new Map(momentum.map((entry) => [entry.repoId, entry.score])),
      aiGateway: new InMemoryAiGateway(),
    });
    const layout = buildConstellationLayout({
      clusters,
      momentum,
    });
    const report = generateReport({
      id: "report-1",
      period: "weekly",
      generatedAt: now,
      metrics: {
        totalStars: 2,
        annotatedCount: 1,
        startedCount: 1,
        watchingCount: 1,
        parkedCount: 0,
        neglectedCount: 0,
        stateDistribution: { saved: 0, watching: 1, started: 1, parked: 0 },
        topLanguages: [{ language: "TypeScript", count: 2 }],
        topTopics: [{ topic: "automation", count: 1 }],
      },
      momentum,
      neglectSignals: [],
      clusters: narratives,
      repositories: repos,
    });

    expect(narratives[0]?.narrative).toContain("Automation");
    expect(layout.nodes).toHaveLength(2);
    expect(report.sections).toHaveLength(4);
    expect(report.summary).toContain("Top mover");
  });
});
