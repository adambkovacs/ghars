import type { GitHubGateway } from "../../ports";
import type { GitHubStarPage, RepoCatalog, RepoReadme } from "../../domain/types";

const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";
const GITHUB_REST_URL = "https://api.github.com";

function toRepoId(fullName: string) {
  return fullName.toLowerCase();
}

function parseRepo(fullName: string) {
  const [owner, name] = fullName.split("/");
  return { owner, name };
}

export class GitHubApiGateway implements GitHubGateway {
  constructor(private readonly accessToken: string) {}

  async listStarred(cursor?: string | null): Promise<GitHubStarPage> {
    const query = `
      query StarredRepos($cursor: String) {
        viewer {
          starredRepositories(first: 50, after: $cursor, orderBy: { field: STARRED_AT, direction: DESC }) {
            pageInfo { hasNextPage endCursor }
            edges {
              starredAt
              node {
                nameWithOwner
                name
                owner { login }
                description
                homepageUrl
                repositoryTopics(first: 12) {
                  nodes {
                    topic { name }
                  }
                }
                primaryLanguage { name }
                stargazerCount
                forkCount
                issues(states: OPEN) { totalCount }
                isArchived
                isFork
                pushedAt
                updatedAt
                createdAt
                latestRelease { publishedAt }
                url
              }
            }
          }
        }
      }
    `;

    const response = await fetch(GITHUB_GRAPHQL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables: { cursor: cursor ?? null } }),
    });

    if (!response.ok) {
      throw new Error(`GitHub GraphQL request failed with ${response.status}`);
    }

    const payload = (await response.json()) as {
      errors?: Array<{ message?: string }>;
      data?: {
        viewer?: {
          starredRepositories?: {
            pageInfo?: { hasNextPage?: boolean; endCursor?: string | null };
            edges?: Array<{
              starredAt: string;
              node: {
                nameWithOwner: string;
                name: string;
                owner: { login: string };
                description?: string | null;
                homepageUrl?: string | null;
                repositoryTopics?: { nodes?: Array<{ topic?: { name?: string | null } | null }> | null } | null;
                primaryLanguage?: { name?: string | null } | null;
                stargazerCount: number;
                forkCount: number;
                issues?: { totalCount: number } | null;
                isArchived: boolean;
                isFork: boolean;
                pushedAt?: string | null;
                updatedAt?: string | null;
                createdAt?: string | null;
                latestRelease?: { publishedAt?: string | null } | null;
                url: string;
              };
            }>;
          };
        };
      };
    };

    if (payload.errors?.length) {
      throw new Error(payload.errors.map((error) => error.message ?? "Unknown GitHub GraphQL error").join("; "));
    }

    const starred = payload.data?.viewer?.starredRepositories;

    return {
      edges:
        starred?.edges?.map((edge) => ({
          starredAt: new Date(edge.starredAt),
          repo: {
            id: toRepoId(edge.node.nameWithOwner),
            fullName: edge.node.nameWithOwner,
            owner: edge.node.owner.login,
            name: edge.node.name,
            description: edge.node.description ?? "",
            url: edge.node.url,
            homepage: edge.node.homepageUrl ?? null,
            topics:
              edge.node.repositoryTopics?.nodes
                ?.flatMap((node) => (node?.topic?.name ? [node.topic.name] : [])) ?? [],
            language: edge.node.primaryLanguage?.name ?? null,
            stargazerCount: edge.node.stargazerCount,
            forksCount: edge.node.forkCount,
            openIssuesCount: edge.node.issues?.totalCount ?? 0,
            pushedAt: edge.node.pushedAt ? new Date(edge.node.pushedAt) : null,
            archived: edge.node.isArchived,
            isFork: edge.node.isFork,
            lastReleaseAt: edge.node.latestRelease?.publishedAt
              ? new Date(edge.node.latestRelease.publishedAt)
              : null,
            createdAt: edge.node.createdAt ? new Date(edge.node.createdAt) : null,
            updatedAt: edge.node.updatedAt ? new Date(edge.node.updatedAt) : null,
          },
        })) ?? [],
      nextCursor: starred?.pageInfo?.hasNextPage ? starred.pageInfo.endCursor ?? null : null,
    };
  }

  async getRepo(fullName: string): Promise<RepoCatalog> {
    const response = await fetch(`${GITHUB_REST_URL}/repos/${fullName}`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: "application/vnd.github+json",
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub repo request failed with ${response.status}`);
    }

    const repo = (await response.json()) as {
      full_name: string;
      description?: string | null;
      html_url: string;
      homepage?: string | null;
      topics?: string[];
      language?: string | null;
      stargazers_count: number;
      forks_count: number;
      open_issues_count: number;
      pushed_at?: string | null;
      archived: boolean;
      fork: boolean;
      created_at?: string | null;
      updated_at?: string | null;
      owner: { login: string };
      name: string;
    };

    return {
      id: toRepoId(repo.full_name),
      fullName: repo.full_name,
      owner: repo.owner.login,
      name: repo.name,
      description: repo.description ?? "",
      url: repo.html_url,
      homepage: repo.homepage ?? null,
      topics: repo.topics ?? [],
      language: repo.language ?? null,
      stargazerCount: repo.stargazers_count,
      forksCount: repo.forks_count,
      openIssuesCount: repo.open_issues_count,
      pushedAt: repo.pushed_at ? new Date(repo.pushed_at) : null,
      archived: repo.archived,
      isFork: repo.fork,
      lastReleaseAt: await this.getLatestRelease(repo.full_name),
      createdAt: repo.created_at ? new Date(repo.created_at) : null,
      updatedAt: repo.updated_at ? new Date(repo.updated_at) : null,
    };
  }

  async getLatestRelease(fullName: string): Promise<Date | null> {
    const response = await fetch(`${GITHUB_REST_URL}/repos/${fullName}/releases/latest`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: "application/vnd.github+json",
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`GitHub release request failed with ${response.status}`);
    }

    const release = (await response.json()) as { published_at?: string | null };
    return release.published_at ? new Date(release.published_at) : null;
  }

  async getReadme(fullName: string): Promise<RepoReadme | null> {
    const response = await fetch(`${GITHUB_REST_URL}/repos/${fullName}/readme`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: "application/vnd.github.raw+json",
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`GitHub README request failed with ${response.status}`);
    }

    const content = (await response.text()).trim();
    if (!content) {
      return null;
    }

    return {
      repoId: toRepoId(fullName),
      content,
      fetchedAt: new Date(),
    };
  }
}

export function githubLoginFromFullName(fullName: string) {
  return parseRepo(fullName).owner;
}
