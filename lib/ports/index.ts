import type {
  GitHubStarPage,
  PortfolioEvent,
  RepoCatalog,
  RepoSnapshotDaily,
  ReportSnapshot,
  SearchResult,
  UserNote,
  UserRepoState,
} from "@/lib/domain/types";

export interface Clock {
  now(): Date;
}

export interface GitHubGateway {
  listStarred(cursor?: string | null): Promise<GitHubStarPage>;
  getRepo(fullName: string): Promise<RepoCatalog>;
  getLatestRelease(fullName: string): Promise<Date | null>;
}

export interface AiGateway {
  embed(inputs: string[]): Promise<number[][]>;
  summarizeRepo(input: { title: string; facts: string[] }): Promise<string>;
}

export interface RepoCatalogStore {
  upsertMany(repos: RepoCatalog[]): Promise<void>;
  listByIds(repoIds: string[]): Promise<RepoCatalog[]>;
}

export interface UserRepoStateStore {
  upsertStarEdges(userId: string, edges: GitHubStarPage["edges"], touchedAt: Date): Promise<void>;
  get(userId: string, repoId: string): Promise<UserRepoState | null>;
  listByUser(userId: string): Promise<UserRepoState[]>;
  save(state: UserRepoState): Promise<void>;
}

export interface UserNoteStore {
  create(note: UserNote): Promise<void>;
  listByUser(userId: string): Promise<UserNote[]>;
  listByRepo(userId: string, repoId: string): Promise<UserNote[]>;
}

export interface PortfolioEventStore {
  append(events: PortfolioEvent[]): Promise<void>;
  listByUser(userId: string): Promise<PortfolioEvent[]>;
}

export interface SnapshotStore {
  listLatest(repoIds: string[]): Promise<RepoSnapshotDaily[]>;
  saveMany(snapshots: RepoSnapshotDaily[]): Promise<void>;
}

export interface SearchIndexStore {
  save(results: SearchResult[]): Promise<void>;
}

export interface ReportSnapshotStore {
  save(report: ReportSnapshot): Promise<void>;
}
