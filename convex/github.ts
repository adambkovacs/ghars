import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { api } from "./_generated/api";
import { GitHubApiGateway } from "../lib/adapters/github/githubApiGateway";
import { buildDerivedArtifacts } from "../lib/server/portfolio/artifacts";
import type {
  GitHubStarEdge,
  PortfolioEvent,
  RepoCatalog,
  RepoSnapshotDaily,
  ReportSection,
  UserNote,
  UserRepoState,
} from "../lib/domain/types";

type RepoCatalogRow = {
  fullName: string;
  owner: string;
  name: string;
  description?: string;
  homepage?: string;
  primaryLanguage?: string;
  topics: string[];
  stars: number;
  forks: number;
  openIssues: number;
  watchers: number;
  archived: boolean;
  pushedAt?: number;
  latestReleaseAt?: number;
  createdAt: number;
  updatedAt: number;
};

type UserRepoStateRow = {
  repoFullName: string;
  state: UserRepoState["state"];
  starredAt: number;
  lastViewedAt?: number;
  lastTouchedAt?: number;
  tags: string[];
  noteCount: number;
};

type UserNoteRow = {
  id: string;
  repoFullName: string;
  body: string;
  createdAt: number;
  updatedAt: number;
};

type PortfolioEventRow = {
  id: string;
  repoFullName?: string;
  type: PortfolioEvent["type"];
  createdAt: number;
  metadata?: unknown;
};

type RepoSnapshotRow = {
  repoFullName: string;
  capturedAt: number;
  stars: number;
  forks: number;
  openIssues: number;
  pushedAt?: number;
  latestReleaseAt?: number;
  momentumScore?: number;
  neglectScore?: number;
};

type GitHubConnectionRow = {
  authUserId: string;
  githubUserId: string;
  githubLogin: string;
  accessToken: string;
  lastSyncedAt?: number;
};

const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";

export const fetchStarredRepos = action({
  args: {
    accessToken: v.string(),
    cursor: v.optional(v.string()),
  },
  returns: v.object({
    edges: v.array(
      v.object({
        fullName: v.string(),
        description: v.optional(v.string()),
        starredAt: v.string(),
      })
    ),
    hasNextPage: v.boolean(),
    endCursor: v.optional(v.string()),
  }),
  handler: async (_ctx, args) => {
    const query = `
      query StarredRepos($cursor: String) {
        viewer {
          starredRepositories(first: 50, after: $cursor, orderBy: { field: STARRED_AT, direction: DESC }) {
            pageInfo { hasNextPage endCursor }
            edges {
              starredAt
              node {
                nameWithOwner
                description
              }
            }
          }
        }
      }
    `;

    const response = await fetch(GITHUB_GRAPHQL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${args.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables: { cursor: args.cursor ?? null } }),
    });

    if (!response.ok) {
      throw new Error(`GitHub GraphQL request failed with ${response.status}`);
    }

    const payload = (await response.json()) as {
      data?: {
        viewer?: {
          starredRepositories?: {
            pageInfo: { hasNextPage: boolean; endCursor?: string | null };
            edges: Array<{
              starredAt: string;
              node: { nameWithOwner: string; description?: string | null };
            }>;
          };
        };
      };
    };

    const starredRepositories = payload.data?.viewer?.starredRepositories;

    return {
      edges:
        starredRepositories?.edges.map((edge) => ({
          fullName: edge.node.nameWithOwner,
          description: edge.node.description ?? undefined,
          starredAt: edge.starredAt,
        })) ?? [],
      hasNextPage: starredRepositories?.pageInfo.hasNextPage ?? false,
      endCursor: starredRepositories?.pageInfo.endCursor ?? undefined,
    };
  },
});

function toRepoInput(repo: RepoCatalog) {
  return {
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
  };
}

function mapRepoCatalog(repo: RepoCatalogRow): RepoCatalog {
  return {
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
  };
}

function mapUserRepoState(
  authUserId: string,
  state: UserRepoStateRow
): UserRepoState {
  return {
    userId: authUserId,
    repoId: state.repoFullName.toLowerCase(),
    state: state.state,
    starredAt: new Date(state.starredAt),
    tags: state.tags,
    noteCount: state.noteCount,
    lastTouchedAt: state.lastTouchedAt ? new Date(state.lastTouchedAt) : null,
    lastViewedAt: state.lastViewedAt ? new Date(state.lastViewedAt) : null,
  };
}

function mapUserNote(
  authUserId: string,
  note: UserNoteRow
): UserNote {
  return {
    id: note.id,
    userId: authUserId,
    repoId: note.repoFullName.toLowerCase(),
    content: note.body,
    createdAt: new Date(note.createdAt),
    updatedAt: new Date(note.updatedAt),
  };
}

function mapPortfolioEvent(
  authUserId: string,
  event: PortfolioEventRow
): PortfolioEvent | null {
  if (!event.repoFullName) {
    return null;
  }

  return {
    id: event.id,
    userId: authUserId,
    repoId: event.repoFullName.toLowerCase(),
    type: event.type,
    occurredAt: new Date(event.createdAt),
    payload:
      event.metadata && typeof event.metadata === "object"
        ? (event.metadata as Record<string, unknown>)
        : undefined,
  };
}

function mapRepoSnapshot(snapshot: RepoSnapshotRow): RepoSnapshotDaily {
  return {
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
  };
}

async function loadPortfolioData(ctx: any, authUserId: string) {
  const [stateRows, noteRows, eventRows] = (await Promise.all([
    ctx.runQuery(api.portfolio.listUserRepoStates, { authUserId }),
    ctx.runQuery(api.portfolio.listUserNotes, { authUserId }),
    ctx.runQuery(api.portfolio.listPortfolioEvents, { authUserId }),
  ])) as [UserRepoStateRow[], UserNoteRow[], PortfolioEventRow[]];

  const states = stateRows.map((state: UserRepoStateRow) => mapUserRepoState(authUserId, state));
  const notes = noteRows.map((note: UserNoteRow) => mapUserNote(authUserId, note));
  const events = eventRows
    .map((event: PortfolioEventRow) => mapPortfolioEvent(authUserId, event))
    .filter((event): event is PortfolioEvent => Boolean(event));
  const fullNames = [...new Set(states.map((state: UserRepoState) => state.repoId))];

  if (fullNames.length === 0) {
    return {
      repositories: [] as RepoCatalog[],
      states,
      notes,
      events,
      snapshots: [] as RepoSnapshotDaily[],
    };
  }

  const [repoRows, snapshotRows] = (await Promise.all([
    ctx.runQuery(api.portfolio.listReposByFullNames, { fullNames }),
    ctx.runQuery(api.portfolio.listRepoSnapshotsByFullNames, { fullNames }),
  ])) as [RepoCatalogRow[], RepoSnapshotRow[]];

  return {
    repositories: repoRows.map(mapRepoCatalog),
    states,
    notes,
    events,
    snapshots: snapshotRows.map(mapRepoSnapshot),
  };
}

async function persistArtifacts(
  ctx: any,
  input: {
    authUserId: string;
    githubLogin: string;
    lastSyncedAt: Date;
  }
) {
  const portfolio = await loadPortfolioData(ctx, input.authUserId);
  const { snapshots, reports } = await buildDerivedArtifacts({
    userId: input.authUserId,
    githubLogin: input.githubLogin,
    lastSyncedAt: input.lastSyncedAt,
    repositories: portfolio.repositories,
    states: portfolio.states,
    notes: portfolio.notes,
    events: portfolio.events,
    existingSnapshots: portfolio.snapshots,
  });

  if (snapshots.length > 0) {
    await ctx.runMutation(api.portfolio.saveRepoSnapshots, {
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

  for (const report of reports) {
    await ctx.runMutation(api.reports.storeReport, {
      authUserId: input.authUserId,
      period: report.period,
      title: report.period === "weekly" ? "Weekly live portfolio review" : "Monthly live portfolio review",
      summary: report.summary,
      highlights: report.sections.map((section: ReportSection) => section.summary).slice(0, 4),
      topRepoIds: report.sections.flatMap((section: ReportSection) => section.evidenceRepoIds).slice(0, 8),
      sections: report.sections.map((section: ReportSection) => ({
        id: section.id,
        title: section.title,
        summary: section.summary,
        evidenceRepoIds: section.evidenceRepoIds,
      })),
      syncCapturedAt: report.generatedAt.getTime(),
    });
  }
}

async function refreshFullPortfolio(
  ctx: any,
  connection: GitHubConnectionRow
) {
  const gateway = new GitHubApiGateway(connection.accessToken);
  const touchedAt = Date.now();
  let cursor: string | null | undefined = null;
  let refreshedRepos = 0;

  do {
    const page = await gateway.listStarred(cursor);
    if (page.edges.length > 0) {
      await ctx.runMutation(api.portfolio.upsertRepoCatalogs, {
        repos: page.edges.map((edge: GitHubStarEdge) => toRepoInput(edge.repo)),
      });
      await ctx.runMutation(api.portfolio.upsertStarEdges, {
        authUserId: connection.authUserId,
        edges: page.edges.map((edge: GitHubStarEdge) => ({
          fullName: edge.repo.fullName,
          starredAt: edge.starredAt.getTime(),
        })),
        touchedAt,
      });
      refreshedRepos += page.edges.length;
    }
    cursor = page.nextCursor;
  } while (cursor);

  await ctx.runMutation(api.portfolio.upsertGitHubConnection, {
    authUserId: connection.authUserId,
    githubUserId: connection.githubUserId,
    githubLogin: connection.githubLogin,
    accessToken: connection.accessToken,
    scopes: [],
    lastSyncedAt: touchedAt,
  });
  await persistArtifacts(ctx, {
    authUserId: connection.authUserId,
    githubLogin: connection.githubLogin,
    lastSyncedAt: new Date(touchedAt),
  });

  return refreshedRepos;
}

async function refreshPriorityPortfolio(
  ctx: any,
  connection: GitHubConnectionRow
) {
  const gateway = new GitHubApiGateway(connection.accessToken);
  const touchedAt = Date.now();
  const states = (await ctx.runQuery(api.portfolio.listUserRepoStates, {
    authUserId: connection.authUserId,
  })) as UserRepoStateRow[];
  const targets = states.filter(
    (state: UserRepoStateRow) => state.state === "watching" || state.state === "started"
  );
  const refreshed: RepoCatalog[] = [];

  for (const target of targets) {
    try {
      refreshed.push(await gateway.getRepo(target.repoFullName));
    } catch (error) {
      console.error(`Failed to refresh ${target.repoFullName}`, error);
    }
  }

  if (refreshed.length === 0) {
    return 0;
  }

  await ctx.runMutation(api.portfolio.upsertRepoCatalogs, {
    repos: refreshed.map((repo) => toRepoInput(repo)),
  });
  await ctx.runMutation(api.portfolio.appendPortfolioEvents, {
    authUserId: connection.authUserId,
    events: refreshed.map((repo) => ({
      type: "repo_refreshed" as const,
      occurredAt: touchedAt,
      repoFullName: repo.fullName,
      payload: {
        fullName: repo.fullName,
        mode: "priority",
      },
    })),
  });
  await ctx.runMutation(api.portfolio.upsertGitHubConnection, {
    authUserId: connection.authUserId,
    githubUserId: connection.githubUserId,
    githubLogin: connection.githubLogin,
    accessToken: connection.accessToken,
    scopes: [],
    lastSyncedAt: touchedAt,
  });
  await persistArtifacts(ctx, {
    authUserId: connection.authUserId,
    githubLogin: connection.githubLogin,
    lastSyncedAt: new Date(touchedAt),
  });

  return refreshed.length;
}

export const refreshConnectedPortfolios = internalAction({
  args: {
    mode: v.union(v.literal("full"), v.literal("priority")),
  },
  returns: v.object({
    mode: v.union(v.literal("full"), v.literal("priority")),
    refreshedUsers: v.number(),
    refreshedRepos: v.number(),
  }),
  handler: async (ctx, args) => {
    const connections = (await ctx.runQuery(api.portfolio.listGitHubConnectionsWithAccessToken, {})) as GitHubConnectionRow[];
    let refreshedUsers = 0;
    let refreshedRepos = 0;

    for (const connection of connections) {
      const count =
        args.mode === "full"
          ? await refreshFullPortfolio(ctx, connection)
          : await refreshPriorityPortfolio(ctx, connection);

      if (count > 0) {
        refreshedUsers += 1;
        refreshedRepos += count;
      }
    }

    return {
      mode: args.mode,
      refreshedUsers,
      refreshedRepos,
    };
  },
});
