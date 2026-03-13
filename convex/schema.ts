import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const repoState = v.union(
  v.literal("saved"),
  v.literal("watching"),
  v.literal("started"),
  v.literal("parked")
);

const portfolioEventType = v.union(
  v.literal("repo_starred"),
  v.literal("note_added"),
  v.literal("state_changed"),
  v.literal("start_session_started"),
  v.literal("start_session_ended"),
  v.literal("repo_refreshed")
);

export default defineSchema({
  githubConnections: defineTable({
    authUserId: v.string(),
    githubUserId: v.string(),
    githubLogin: v.string(),
    accessToken: v.optional(v.string()),
    scopes: v.array(v.string()),
    lastSyncedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_authUserId", ["authUserId"])
    .index("by_githubUserId", ["githubUserId"]),

  repoCatalog: defineTable({
    fullName: v.string(),
    owner: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    homepage: v.optional(v.string()),
    primaryLanguage: v.optional(v.string()),
    license: v.optional(v.string()),
    topics: v.array(v.string()),
    stars: v.number(),
    forks: v.number(),
    openIssues: v.number(),
    watchers: v.number(),
    archived: v.boolean(),
    pushedAt: v.optional(v.number()),
    latestReleaseAt: v.optional(v.number()),
    summary: v.optional(v.string()),
    embeddingId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_fullName", ["fullName"])
    .searchIndex("search_name_and_description", {
      searchField: "fullName",
      filterFields: ["archived", "primaryLanguage"],
    }),

  userRepoStates: defineTable({
    authUserId: v.string(),
    repoId: v.id("repoCatalog"),
    state: repoState,
    starredAt: v.number(),
    lastViewedAt: v.optional(v.number()),
    lastTouchedAt: v.optional(v.number()),
    tags: v.array(v.string()),
    noteCount: v.number(),
    importance: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_authUserId", ["authUserId"])
    .index("by_authUserId_repoId", ["authUserId", "repoId"])
    .index("by_authUserId_state", ["authUserId", "state"]),

  userNotes: defineTable({
    authUserId: v.string(),
    repoId: v.id("repoCatalog"),
    body: v.string(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_authUserId_repoId", ["authUserId", "repoId"])
    .searchIndex("search_body", {
      searchField: "body",
      filterFields: ["authUserId"],
    }),

  portfolioEvents: defineTable({
    authUserId: v.string(),
    repoId: v.optional(v.id("repoCatalog")),
    type: portfolioEventType,
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_authUserId", ["authUserId"])
    .index("by_authUserId_type", ["authUserId", "type"])
    .index("by_authUserId_repoId", ["authUserId", "repoId"]),

  repoSnapshots: defineTable({
    repoId: v.id("repoCatalog"),
    capturedAt: v.number(),
    stars: v.number(),
    forks: v.number(),
    openIssues: v.number(),
    pushedAt: v.optional(v.number()),
    latestReleaseAt: v.optional(v.number()),
    momentumScore: v.optional(v.number()),
    neglectScore: v.optional(v.number()),
  })
    .index("by_repoId", ["repoId"])
    .index("by_repoId_capturedAt", ["repoId", "capturedAt"]),

  repoClusters: defineTable({
    authUserId: v.string(),
    clusterKey: v.string(),
    name: v.string(),
    narrative: v.optional(v.string()),
    topics: v.array(v.string()),
    repoIds: v.array(v.id("repoCatalog")),
    momentumScore: v.number(),
    updatedAt: v.number(),
  })
    .index("by_authUserId", ["authUserId"])
    .index("by_authUserId_clusterKey", ["authUserId", "clusterKey"]),

  savedViews: defineTable({
    authUserId: v.string(),
    name: v.string(),
    query: v.string(),
    filters: v.any(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_authUserId", ["authUserId"]),

  reportSnapshots: defineTable({
    authUserId: v.string(),
    period: v.union(v.literal("weekly"), v.literal("monthly")),
    title: v.string(),
    summary: v.string(),
    highlights: v.array(v.string()),
    topRepoIds: v.array(v.string()),
    sections: v.optional(
      v.array(
        v.object({
          id: v.string(),
          title: v.string(),
          summary: v.string(),
          evidenceRepoIds: v.array(v.string()),
        })
      )
    ),
    syncCapturedAt: v.optional(v.number()),
    generatedAt: v.number(),
  })
    .index("by_authUserId", ["authUserId"])
    .index("by_authUserId_period", ["authUserId", "period"]),
});
