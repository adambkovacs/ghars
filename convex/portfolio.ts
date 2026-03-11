import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getDashboardData = query({
  args: { clerkUserId: v.string() },
  returns: v.object({
    repoCount: v.number(),
    noteCount: v.number(),
    reportCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const userRepoStates = await ctx.db
      .query("userRepoStates")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", args.clerkUserId))
      .collect();

    const notes = await ctx.db
      .query("userNotes")
      .withIndex("by_clerkUserId_repoId", (q) => q.eq("clerkUserId", args.clerkUserId))
      .collect();

    const reports = await ctx.db
      .query("reportSnapshots")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", args.clerkUserId))
      .collect();

    return {
      repoCount: userRepoStates.length,
      noteCount: notes.length,
      reportCount: reports.length,
    };
  },
});

export const changeRepoState = mutation({
  args: {
    clerkUserId: v.string(),
    repoId: v.id("repoCatalog"),
    state: v.union(
      v.literal("saved"),
      v.literal("watching"),
      v.literal("started"),
      v.literal("parked")
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userRepoStates")
      .withIndex("by_clerkUserId_repoId", (q) =>
        q.eq("clerkUserId", args.clerkUserId).eq("repoId", args.repoId)
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
      clerkUserId: args.clerkUserId,
      repoId: args.repoId,
      type: "state_changed",
      metadata: { state: args.state },
      createdAt: Date.now(),
    });

    return null;
  },
});

export const addNote = mutation({
  args: {
    clerkUserId: v.string(),
    repoId: v.id("repoCatalog"),
    body: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("userNotes", {
      clerkUserId: args.clerkUserId,
      repoId: args.repoId,
      body: args.body,
      createdAt: Date.now(),
    });

    const state = await ctx.db
      .query("userRepoStates")
      .withIndex("by_clerkUserId_repoId", (q) =>
        q.eq("clerkUserId", args.clerkUserId).eq("repoId", args.repoId)
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
      clerkUserId: args.clerkUserId,
      repoId: args.repoId,
      type: "note_added",
      createdAt: Date.now(),
    });

    return null;
  },
});
