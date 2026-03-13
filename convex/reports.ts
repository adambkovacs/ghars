import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listReports = query({
  args: {
    authUserId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("reportSnapshots"),
      title: v.string(),
      period: v.union(v.literal("weekly"), v.literal("monthly")),
      summary: v.string(),
      highlights: v.array(v.string()),
      topRepoIds: v.array(v.string()),
      sections: v.array(
        v.object({
          id: v.string(),
          title: v.string(),
          summary: v.string(),
          evidenceRepoIds: v.array(v.string()),
        })
      ),
      syncCapturedAt: v.optional(v.number()),
      generatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const reports = await ctx.db
      .query("reportSnapshots")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", args.authUserId))
      .order("desc")
      .collect();

    const latestByPeriod = new Map<string, (typeof reports)[number]>();
    for (const report of reports) {
      if (!latestByPeriod.has(report.period)) {
        latestByPeriod.set(report.period, report);
      }
    }

    return [...latestByPeriod.values()].map((report) => ({
      _id: report._id,
      title: report.title,
      period: report.period,
      summary: report.summary,
      highlights: report.highlights,
      topRepoIds: report.topRepoIds,
      sections: report.sections ?? [],
      syncCapturedAt: report.syncCapturedAt,
      generatedAt: report.generatedAt,
    }));
  },
});

export const storeReport = mutation({
  args: {
    authUserId: v.string(),
    period: v.union(v.literal("weekly"), v.literal("monthly")),
    title: v.string(),
    summary: v.string(),
    highlights: v.array(v.string()),
    topRepoIds: v.array(v.string()),
    sections: v.array(
      v.object({
        id: v.string(),
        title: v.string(),
        summary: v.string(),
        evidenceRepoIds: v.array(v.string()),
      })
    ),
    syncCapturedAt: v.optional(v.number()),
  },
  returns: v.id("reportSnapshots"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("reportSnapshots")
      .withIndex("by_authUserId_period", (q) =>
        q.eq("authUserId", args.authUserId).eq("period", args.period)
      )
      .order("desc")
      .first();

    const payload = {
      ...args,
      generatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return existing._id;
    }

    return await ctx.db.insert("reportSnapshots", payload);
  },
});
