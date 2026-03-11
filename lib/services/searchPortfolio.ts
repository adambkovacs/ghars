import type { RepoCatalog, SearchFilters, SearchResult, UserNote, UserRepoState } from "@/lib/domain/types";

function matchesFilters(
  repo: RepoCatalog,
  state: UserRepoState,
  notes: UserNote[],
  filters?: SearchFilters
): boolean {
  if (!filters) {
    return true;
  }

  if (filters.archived !== undefined && repo.archived !== filters.archived) {
    return false;
  }

  if (filters.state && filters.state.length > 0 && !filters.state.includes(state.state)) {
    return false;
  }

  if (filters.language && filters.language.length > 0) {
    if (!repo.language || !filters.language.includes(repo.language)) {
      return false;
    }
  }

  if (filters.topics && filters.topics.length > 0) {
    const topicSet = new Set(repo.topics);
    if (!filters.topics.some((topic) => topicSet.has(topic))) {
      return false;
    }
  }

  if (filters.tags && filters.tags.length > 0) {
    const tagSet = new Set(state.tags);
    if (!filters.tags.some((tag) => tagSet.has(tag))) {
      return false;
    }
  }

  if (notes.length === 0 && filters.tags && filters.tags.length > 0 && state.tags.length === 0) {
    return false;
  }

  return true;
}

export function searchPortfolio(input: {
  query: string;
  repositories: RepoCatalog[];
  userStates: UserRepoState[];
  notes: UserNote[];
  filters?: SearchFilters;
}): SearchResult[] {
  const query = input.query.trim().toLowerCase();
  const repoById = new Map(input.repositories.map((repo) => [repo.id, repo]));
  const notesByRepo = new Map<string, UserNote[]>();

  for (const note of input.notes) {
    const next = notesByRepo.get(note.repoId) ?? [];
    next.push(note);
    notesByRepo.set(note.repoId, next);
  }

  return input.userStates
    .map((state) => {
      const repo = repoById.get(state.repoId);
      if (!repo) {
        return null;
      }

      const repoNotes = notesByRepo.get(repo.id) ?? [];
      if (!matchesFilters(repo, state, repoNotes, input.filters)) {
        return null;
      }

      const reasons: string[] = [];
      let score = 0;

      if (query.length === 0) {
        score = 1;
        reasons.push("default listing");
      } else {
        const fullName = repo.fullName.toLowerCase();
        const description = repo.description.toLowerCase();
        const topics = repo.topics.map((topic) => topic.toLowerCase());
        const noteText = repoNotes.map((note) => note.content.toLowerCase()).join(" ");

        if (fullName === query) {
          score += 100;
          reasons.push("exact repo match");
        }
        if (fullName.includes(query)) {
          score += 45;
          reasons.push("repo name");
        }
        if (description.includes(query)) {
          score += 18;
          reasons.push("description");
        }
        if (topics.some((topic) => topic.includes(query))) {
          score += 14;
          reasons.push("topic");
        }
        if (repo.language?.toLowerCase().includes(query)) {
          score += 8;
          reasons.push("language");
        }
        if (state.state.includes(query as typeof state.state)) {
          score += 6;
          reasons.push("state");
        }
        if (state.tags.some((tag) => tag.toLowerCase().includes(query))) {
          score += 12;
          reasons.push("tag");
        }
        if (noteText.includes(query)) {
          score += 24;
          reasons.push("note");
        }
      }

      if (score === 0) {
        return null;
      }

      return {
        repo,
        state,
        notes: repoNotes,
        score,
        reasons,
      } satisfies SearchResult;
    })
    .filter((result): result is SearchResult => result !== null)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      const rightTouched = right.state.lastTouchedAt?.getTime() ?? 0;
      const leftTouched = left.state.lastTouchedAt?.getTime() ?? 0;
      if (rightTouched !== leftTouched) {
        return rightTouched - leftTouched;
      }

      return right.state.starredAt.getTime() - left.state.starredAt.getTime();
    });
}
