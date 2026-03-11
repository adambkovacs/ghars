import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listReports = query({
  args: {
    clerkUserId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("reportSnapshots"),
      title: v.string(),
      period: v.union(v.literal("weekly"), v.literal("monthly")),
      summary: v.string(),
      generatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const reports = await ctx.db
      .query("reportSnapshots")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", args.clerkUserId))
      .order("desc")
      .take(12);

    return reports.map((report) => ({
      _id: report._id,
      title: report.title,
      period: report.period,
      summary: report.summary,
      generatedAt: report.generatedAt,
    }));
  },
});

export const storeReport = mutation({
  args: {
    clerkUserId: v.string(),
    period: v.union(v.literal("weekly"), v.literal("monthly")),
    title: v.string(),
    summary: v.string(),
    highlights: v.array(v.string()),
    topRepoIds: v.array(v.id("repoCatalog")),
  },
  returns: v.id("reportSnapshots"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("reportSnapshots", {
      ...args,
      generatedAt: Date.now(),
    });
  },
});
