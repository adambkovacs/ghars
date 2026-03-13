import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";

const repoStateValidator = v.union(
  v.literal("saved"),
  v.literal("watching"),
  v.literal("started"),
  v.literal("parked")
);

const portfolioEventTypeValidator = v.union(
  v.literal("repo_starred"),
  v.literal("note_added"),
  v.literal("state_changed"),
  v.literal("start_session_started"),
  v.literal("start_session_ended"),
  v.literal("repo_refreshed")
);

const repoInputValidator = v.object({
  fullName: v.string(),
  owner: v.string(),
  name: v.string(),
  description: v.optional(v.string()),
  homepage: v.optional(v.string()),
  primaryLanguage: v.optional(v.string()),
  topics: v.array(v.string()),
  stars: v.number(),
  forks: v.number(),
  openIssues: v.number(),
  watchers: v.number(),
  archived: v.boolean(),
  pushedAt: v.optional(v.number()),
  latestReleaseAt: v.optional(v.number()),
  createdAt: v.optional(v.number()),
  updatedAt: v.optional(v.number()),
});

const starEdgeInputValidator = v.object({
  fullName: v.string(),
  starredAt: v.number(),
});

const eventInputValidator = v.object({
  type: portfolioEventTypeValidator,
  occurredAt: v.number(),
  repoFullName: v.optional(v.string()),
  payload: v.optional(v.any()),
});

async function findRepoByFullName(
  ctx: QueryCtx | MutationCtx,
  fullName: string
) {
  const exact = await ctx.db
    .query("repoCatalog")
    .withIndex("by_fullName", (q) => q.eq("fullName", fullName))
    .unique();

  if (exact) {
    return exact;
  }

  const normalized = fullName.toLowerCase();
  const allRepos = await ctx.db.query("repoCatalog").collect();
  return allRepos.find((repo) => repo.fullName.toLowerCase() === normalized) ?? null;
}

function serializeRepoCatalog(repo: {
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
}) {
  return {
    fullName: repo.fullName,
    owner: repo.owner,
    name: repo.name,
    description: repo.description,
    homepage: repo.homepage,
    primaryLanguage: repo.primaryLanguage,
    topics: repo.topics,
    stars: repo.stars,
    forks: repo.forks,
    openIssues: repo.openIssues,
    watchers: repo.watchers,
    archived: repo.archived,
    pushedAt: repo.pushedAt,
    latestReleaseAt: repo.latestReleaseAt,
    createdAt: repo.createdAt,
    updatedAt: repo.updatedAt,
  };
}

export const listUserRepoStates = query({
  args: {
    authUserId: v.string(),
  },
  returns: v.array(
    v.object({
      repoFullName: v.string(),
      state: repoStateValidator,
      starredAt: v.number(),
      lastViewedAt: v.optional(v.number()),
      lastTouchedAt: v.optional(v.number()),
      tags: v.array(v.string()),
      noteCount: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const states = await ctx.db
      .query("userRepoStates")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", args.authUserId))
      .collect();

    const repoIds = [...new Set(states.map((state) => state.repoId))];
    const repos = await Promise.all(repoIds.map((repoId) => ctx.db.get(repoId)));
    const fullNameByRepoId = new Map(
      repos
        .filter((repo): repo is NonNullable<typeof repo> => Boolean(repo))
        .map((repo) => [repo._id, repo.fullName])
    );

    return states.flatMap((state) => {
      const repoFullName = fullNameByRepoId.get(state.repoId);
      if (!repoFullName) {
        return [];
      }

      return [
        {
          repoFullName,
          state: state.state,
          starredAt: state.starredAt,
          lastViewedAt: state.lastViewedAt,
          lastTouchedAt: state.lastTouchedAt,
          tags: state.tags,
          noteCount: state.noteCount,
        },
      ];
    });
  },
});

export const listUserNotes = query({
  args: {
    authUserId: v.string(),
  },
  returns: v.array(
    v.object({
      id: v.string(),
      repoFullName: v.string(),
      body: v.string(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const notes = await ctx.db
      .query("userNotes")
      .withIndex("by_authUserId_repoId", (q) => q.eq("authUserId", args.authUserId))
      .collect();

    const repoIds = [...new Set(notes.map((note) => note.repoId))];
    const repos = await Promise.all(repoIds.map((repoId) => ctx.db.get(repoId)));
    const fullNameByRepoId = new Map(
      repos
        .filter((repo): repo is NonNullable<typeof repo> => Boolean(repo))
        .map((repo) => [repo._id, repo.fullName])
    );

    return notes.flatMap((note) => {
      const repoFullName = fullNameByRepoId.get(note.repoId);
      if (!repoFullName) {
        return [];
      }

      return [
        {
          id: note._id,
          repoFullName,
          body: note.body,
          createdAt: note.createdAt,
          updatedAt: note.createdAt,
        },
      ];
    });
  },
});

export const listReposByFullNames = query({
  args: {
    fullNames: v.array(v.string()),
  },
  returns: v.array(
    v.object({
      fullName: v.string(),
      owner: v.string(),
      name: v.string(),
      description: v.optional(v.string()),
      homepage: v.optional(v.string()),
      primaryLanguage: v.optional(v.string()),
      topics: v.array(v.string()),
      stars: v.number(),
      forks: v.number(),
      openIssues: v.number(),
      watchers: v.number(),
      archived: v.boolean(),
      pushedAt: v.optional(v.number()),
      latestReleaseAt: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const uniqueFullNames = [...new Set(args.fullNames.map((fullName) => fullName.toLowerCase()))];
    const repoCatalog = await ctx.db.query("repoCatalog").collect();
    const repoByFullName = new Map(
      repoCatalog.map((repo) => [repo.fullName.toLowerCase(), serializeRepoCatalog(repo)])
    );

    return uniqueFullNames.flatMap((fullName) => {
      const repo = repoByFullName.get(fullName);
      return repo ? [repo] : [];
    });
  },
});

export const getGitHubConnection = query({
  args: {
    authUserId: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      githubUserId: v.string(),
      githubLogin: v.string(),
      lastSyncedAt: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const connection = await ctx.db
      .query("githubConnections")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", args.authUserId))
      .unique();

    if (!connection) {
      return null;
    }

    return {
      githubUserId: connection.githubUserId,
      githubLogin: connection.githubLogin,
      lastSyncedAt: connection.lastSyncedAt,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
    };
  },
});

export const upsertRepoCatalogs = mutation({
  args: {
    repos: v.array(repoInputValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (const repo of args.repos) {
      const existing = await findRepoByFullName(ctx, repo.fullName);

      const payload = {
        fullName: repo.fullName,
        owner: repo.owner,
        name: repo.name,
        description: repo.description,
        homepage: repo.homepage,
        primaryLanguage: repo.primaryLanguage,
        topics: repo.topics,
        stars: repo.stars,
        forks: repo.forks,
        openIssues: repo.openIssues,
        watchers: repo.watchers,
        archived: repo.archived,
        pushedAt: repo.pushedAt,
        latestReleaseAt: repo.latestReleaseAt,
        createdAt: repo.createdAt ?? Date.now(),
        updatedAt: repo.updatedAt ?? Date.now(),
      };

      if (existing) {
        await ctx.db.patch(existing._id, payload);
      } else {
        await ctx.db.insert("repoCatalog", payload);
      }
    }

    return null;
  },
});

export const upsertStarEdges = mutation({
  args: {
    authUserId: v.string(),
    edges: v.array(starEdgeInputValidator),
    touchedAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (const edge of args.edges) {
      const repo = await findRepoByFullName(ctx, edge.fullName);

      if (!repo) {
        continue;
      }

      const existing = await ctx.db
        .query("userRepoStates")
        .withIndex("by_authUserId_repoId", (q) =>
          q.eq("authUserId", args.authUserId).eq("repoId", repo._id)
        )
        .unique();

      if (existing) {
        await ctx.db.patch(existing._id, {
          state: existing.state,
          starredAt: existing.starredAt ?? edge.starredAt,
          lastTouchedAt: args.touchedAt,
          tags: existing.tags,
          noteCount: existing.noteCount,
          updatedAt: args.touchedAt,
        });
        continue;
      }

      await ctx.db.insert("userRepoStates", {
        authUserId: args.authUserId,
        repoId: repo._id,
        state: "saved",
        starredAt: edge.starredAt,
        lastViewedAt: undefined,
        lastTouchedAt: args.touchedAt,
        tags: [],
        noteCount: 0,
        importance: undefined,
        createdAt: args.touchedAt,
        updatedAt: args.touchedAt,
      });
    }

    return null;
  },
});

export const appendPortfolioEvents = mutation({
  args: {
    authUserId: v.string(),
    events: v.array(eventInputValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (const event of args.events) {
      const repo = event.repoFullName ? await findRepoByFullName(ctx, event.repoFullName) : null;

      await ctx.db.insert("portfolioEvents", {
        authUserId: args.authUserId,
        repoId: repo?._id,
        type: event.type,
        metadata: event.payload,
        createdAt: event.occurredAt,
      });
    }

    return null;
  },
});

export const upsertGitHubConnection = mutation({
  args: {
    authUserId: v.string(),
    githubUserId: v.string(),
    githubLogin: v.string(),
    accessToken: v.optional(v.string()),
    scopes: v.array(v.string()),
    lastSyncedAt: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("githubConnections")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", args.authUserId))
      .unique();

    const payload = {
      authUserId: args.authUserId,
      githubUserId: args.githubUserId,
      githubLogin: args.githubLogin,
      accessToken: args.accessToken,
      scopes: args.scopes,
      lastSyncedAt: args.lastSyncedAt,
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return null;
    }

    await ctx.db.insert("githubConnections", {
      ...payload,
      createdAt: Date.now(),
    });
    return null;
  },
});

export const changeRepoState = mutation({
  args: {
    authUserId: v.string(),
    repoFullName: v.string(),
    state: repoStateValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const repo = await findRepoByFullName(ctx, args.repoFullName);

    if (!repo) {
      return null;
    }

    const existing = await ctx.db
      .query("userRepoStates")
      .withIndex("by_authUserId_repoId", (q) =>
        q.eq("authUserId", args.authUserId).eq("repoId", repo._id)
      )
      .unique();

    if (!existing) {
      return null;
    }

    await ctx.db.patch(existing._id, {
      state: args.state,
      lastTouchedAt: Date.now(),
      updatedAt: Date.now(),
    });

    await ctx.db.insert("portfolioEvents", {
      authUserId: args.authUserId,
      repoId: repo._id,
      type: "state_changed",
      metadata: { state: args.state },
      createdAt: Date.now(),
    });

    return null;
  },
});

export const addNote = mutation({
  args: {
    authUserId: v.string(),
    repoFullName: v.string(),
    body: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const repo = await findRepoByFullName(ctx, args.repoFullName);

    if (!repo) {
      return null;
    }

    await ctx.db.insert("userNotes", {
      authUserId: args.authUserId,
      repoId: repo._id,
      body: args.body,
      createdAt: Date.now(),
    });

    const state = await ctx.db
      .query("userRepoStates")
      .withIndex("by_authUserId_repoId", (q) =>
        q.eq("authUserId", args.authUserId).eq("repoId", repo._id)
      )
      .unique();

    if (state) {
      await ctx.db.patch(state._id, {
        noteCount: state.noteCount + 1,
        lastTouchedAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    await ctx.db.insert("portfolioEvents", {
      authUserId: args.authUserId,
      repoId: repo._id,
      type: "note_added",
      createdAt: Date.now(),
    });

    return null;
  },
});
