import type {
  AiGateway,
  Clock,
  GitHubGateway,
  PortfolioEventStore,
  RepoCatalogStore,
  ReportSnapshotStore,
  SnapshotStore,
  UserNoteStore,
  UserRepoStateStore,
} from "../../lib/ports";
import type {
  GitHubStarPage,
  PortfolioEvent,
  RepoCatalog,
  RepoSnapshotDaily,
  ReportSnapshot,
  UserNote,
  UserRepoState,
} from "../../lib/domain/types";

export class FixedClock implements Clock {
  constructor(private readonly value: Date) {}

  now(): Date {
    return this.value;
  }
}

export class InMemoryGitHubGateway implements GitHubGateway {
  constructor(
    private readonly pages: GitHubStarPage[],
    private readonly releases: Record<string, Date | null> = {}
  ) {}

  private index = 0;

  async listStarred(): Promise<GitHubStarPage> {
    const next = this.pages[this.index] ?? { edges: [], nextCursor: null };
    this.index += 1;
    return next;
  }

  async getRepo(fullName: string): Promise<RepoCatalog> {
    for (const page of this.pages) {
      const edge = page.edges.find((item) => item.repo.fullName === fullName);
      if (edge) {
        return edge.repo;
      }
    }
    throw new Error(`Repo not found: ${fullName}`);
  }

  async getLatestRelease(fullName: string): Promise<Date | null> {
    return this.releases[fullName] ?? null;
  }
}

export class InMemoryRepoCatalogStore implements RepoCatalogStore {
  public readonly records = new Map<string, RepoCatalog>();

  async upsertMany(repos: RepoCatalog[]): Promise<void> {
    for (const repo of repos) {
      this.records.set(repo.id, repo);
    }
  }

  async listByIds(repoIds: string[]): Promise<RepoCatalog[]> {
    return repoIds.flatMap((repoId) => {
      const repo = this.records.get(repoId);
      return repo ? [repo] : [];
    });
  }
}

export class InMemoryUserRepoStateStore implements UserRepoStateStore {
  public readonly records = new Map<string, UserRepoState>();

  async upsertStarEdges(userId: string, edges: GitHubStarPage["edges"], touchedAt: Date): Promise<void> {
    for (const edge of edges) {
      const key = `${userId}:${edge.repo.id}`;
      const existing = this.records.get(key);
      this.records.set(key, {
        userId,
        repoId: edge.repo.id,
        state: existing?.state ?? "saved",
        starredAt: existing?.starredAt ?? edge.starredAt,
        tags: existing?.tags ?? [],
        noteCount: existing?.noteCount ?? 0,
        lastTouchedAt: touchedAt,
        lastViewedAt: existing?.lastViewedAt ?? null,
      });
    }
  }

  async get(userId: string, repoId: string): Promise<UserRepoState | null> {
    return this.records.get(`${userId}:${repoId}`) ?? null;
  }

  async listByUser(userId: string): Promise<UserRepoState[]> {
    return [...this.records.values()].filter((item) => item.userId === userId);
  }

  async save(state: UserRepoState): Promise<void> {
    this.records.set(`${state.userId}:${state.repoId}`, state);
  }
}

export class InMemoryUserNoteStore implements UserNoteStore {
  public readonly notes: UserNote[] = [];

  async create(note: UserNote): Promise<void> {
    this.notes.push(note);
  }

  async listByUser(userId: string): Promise<UserNote[]> {
    return this.notes.filter((note) => note.userId === userId);
  }

  async listByRepo(userId: string, repoId: string): Promise<UserNote[]> {
    return this.notes.filter((note) => note.userId === userId && note.repoId === repoId);
  }
}

export class InMemoryPortfolioEventStore implements PortfolioEventStore {
  public readonly events: PortfolioEvent[] = [];

  async append(events: PortfolioEvent[]): Promise<void> {
    this.events.push(...events);
  }

  async listByUser(userId: string): Promise<PortfolioEvent[]> {
    return this.events.filter((event) => event.userId === userId);
  }
}

export class InMemorySnapshotStore implements SnapshotStore {
  public readonly snapshots: RepoSnapshotDaily[] = [];

  async listLatest(repoIds: string[]): Promise<RepoSnapshotDaily[]> {
    return this.snapshots.filter((snapshot) => repoIds.includes(snapshot.repoId));
  }

  async saveMany(snapshots: RepoSnapshotDaily[]): Promise<void> {
    this.snapshots.push(...snapshots);
  }
}

export class InMemoryAiGateway implements AiGateway {
  async embed(inputs: string[]): Promise<number[][]> {
    return inputs.map((input, index) => [index, input.length]);
  }

  async summarizeRepo(input: { title: string; facts: string[] }): Promise<string> {
    return `${input.title}: ${input.facts.join(" | ")}`;
  }
}

export class InMemoryReportSnapshotStore implements ReportSnapshotStore {
  public readonly reports: ReportSnapshot[] = [];

  async save(_userId: string, report: ReportSnapshot): Promise<void> {
    const existingIndex = this.reports.findIndex((candidate) => candidate.period === report.period);
    if (existingIndex >= 0) {
      this.reports[existingIndex] = report;
      return;
    }

    this.reports.push(report);
  }

  async listByUser(): Promise<ReportSnapshot[]> {
    return [...this.reports];
  }
}
