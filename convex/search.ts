import { v } from "convex/values";
import { query } from "./_generated/server";

export const searchNotes = query({
  args: {
    authUserId: v.string(),
    query: v.string(),
  },
  returns: v.array(
    v.object({
      body: v.string(),
      repoId: v.id("repoCatalog"),
    })
  ),
  handler: async (ctx, args) => {
    const notes = await ctx.db
      .query("userNotes")
      .withSearchIndex("search_body", (q) =>
        q.search("body", args.query).eq("authUserId", args.authUserId)
      )
      .take(20);

    return notes.map((note) => ({
      body: note.body,
      repoId: note.repoId,
    }));
  },
});
