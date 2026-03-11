import { v } from "convex/values";
import { action } from "./_generated/server";

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
