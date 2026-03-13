import type { RepoCatalog, RepoReadme, UserRepoState } from "../../domain/types";

function stripMarkdown(markdown: string) {
  return markdown
    .replace(/^!\[[^\]]*\]\([^)]+\)$/gm, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`{1,3}[^`]*`{1,3}/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/[*_~]/g, "")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function firstMeaningfulParagraph(text: string) {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length >= 40);

  return paragraphs[0] ?? text.slice(0, 400);
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

export function deriveReadmeMetadata(content: string) {
  const normalized = stripMarkdown(content);
  const summary = truncate(firstMeaningfulParagraph(normalized), 260);
  const excerpt = truncate(normalized, 1200);

  return {
    summary,
    excerpt,
  };
}

export function buildReadmeEnrichment(repo: RepoCatalog, readme: RepoReadme): RepoCatalog {
  const metadata = deriveReadmeMetadata(readme.content);

  return {
    ...repo,
    readmeSummary: metadata.summary,
    readmeExcerpt: metadata.excerpt,
    readmeFetchedAt: readme.fetchedAt,
  };
}

export function selectReadmeCandidates(input: {
  repositories: RepoCatalog[];
  states: UserRepoState[];
  limit: number;
}) {
  const stateByRepoId = new Map(input.states.map((state) => [state.repoId, state]));

  return [...input.repositories]
    .filter((repo) => !repo.readmeFetchedAt)
    .sort((left, right) => {
      const leftState = stateByRepoId.get(left.id);
      const rightState = stateByRepoId.get(right.id);
      const leftStateRank = readmePriorityRank(leftState?.state);
      const rightStateRank = readmePriorityRank(rightState?.state);
      if (leftStateRank !== rightStateRank) {
        return rightStateRank - leftStateRank;
      }

      const rightStar = rightState?.starredAt.getTime() ?? 0;
      const leftStar = leftState?.starredAt.getTime() ?? 0;
      if (rightStar !== leftStar) {
        return rightStar - leftStar;
      }

      return right.stargazerCount - left.stargazerCount;
    })
    .slice(0, input.limit);
}

function readmePriorityRank(state?: UserRepoState["state"]) {
  switch (state) {
    case "started":
      return 4;
    case "watching":
      return 3;
    case "saved":
      return 2;
    case "parked":
      return 1;
    default:
      return 0;
  }
}
