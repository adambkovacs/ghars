export type RepoState = "saved" | "watching" | "started" | "parked";

export type PortfolioEventType =
  | "repo_starred"
  | "note_added"
  | "state_changed"
  | "start_session_started"
  | "start_session_ended"
  | "repo_refreshed";

export type ReportPeriod = "weekly" | "monthly";

export interface RepoCatalog {
  id: string;
  fullName: string;
  owner: string;
  name: string;
  description: string;
  url: string;
  homepage?: string | null;
  topics: string[];
  language?: string | null;
  stargazerCount: number;
  forksCount: number;
  openIssuesCount: number;
  pushedAt?: Date | null;
  archived: boolean;
  isFork: boolean;
  lastReleaseAt?: Date | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export interface GitHubStarEdge {
  repo: RepoCatalog;
  starredAt: Date;
}

export interface GitHubStarPage {
  edges: GitHubStarEdge[];
  nextCursor?: string | null;
}

export interface UserRepoState {
  userId: string;
  repoId: string;
  state: RepoState;
  starredAt: Date;
  tags: string[];
  noteCount: number;
  lastTouchedAt?: Date | null;
  lastViewedAt?: Date | null;
}

export interface UserNote {
  id: string;
  userId: string;
  repoId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PortfolioEvent {
  id: string;
  userId: string;
  repoId: string;
  type: PortfolioEventType;
  occurredAt: Date;
  payload?: Record<string, unknown>;
}

export interface RepoSnapshotDaily {
  repoId: string;
  snapshotDate: Date;
  stargazersCount: number;
  forksCount: number;
  openIssuesCount: number;
  pushedAt?: Date | null;
  archived: boolean;
  lastReleaseAt?: Date | null;
  momentumScore?: number | null;
  neglectScore?: number | null;
}

export interface RepoCluster {
  id: string;
  label: string;
  repoIds: string[];
  topicSeed?: string | null;
  languageSeed?: string | null;
  narrative?: string;
}

export interface SavedView {
  id: string;
  name: string;
  query: string;
  filters: SearchFilters;
}

export interface ReportSection {
  id: string;
  title: string;
  summary: string;
  evidenceRepoIds: string[];
}

export interface ReportSnapshot {
  id: string;
  period: ReportPeriod;
  generatedAt: Date;
  summary: string;
  sections: ReportSection[];
}

export interface SearchFilters {
  state?: RepoState[];
  language?: string[];
  topics?: string[];
  archived?: boolean;
  tags?: string[];
}

export interface SearchResult {
  repo: RepoCatalog;
  state: UserRepoState;
  notes: UserNote[];
  score: number;
  reasons: string[];
}

export interface TopicDriftPoint {
  label: string;
  topic: string;
  count: number;
}

export interface TopicDriftSummary {
  series: TopicDriftPoint[];
  risingTopics: { topic: string; delta: number }[];
  coolingTopics: { topic: string; delta: number }[];
}

export interface OverviewMetrics {
  totalStars: number;
  annotatedCount: number;
  startedCount: number;
  watchingCount: number;
  parkedCount: number;
  neglectedCount: number;
  stateDistribution: Record<RepoState, number>;
  topLanguages: { language: string; count: number }[];
  topTopics: { topic: string; count: number }[];
}

export interface MomentumInput {
  repo: RepoCatalog;
  currentSnapshot?: RepoSnapshotDaily | null;
  previousSnapshot?: RepoSnapshotDaily | null;
  userTouchCount14d: number;
  now: Date;
}

export interface RepoMomentum {
  repoId: string;
  score: number;
  starDelta7d: number;
  forkDelta30d: number;
  pushRecency: number;
  releaseRecency: number;
  userTouch14d: number;
}

export interface NeglectSignal {
  repoId: string;
  score: number;
  reasons: string[];
}

export interface ClusterNarrative {
  clusterId: string;
  label: string;
  narrative: string;
  topTopics: string[];
  repoCount: number;
}

export interface ConstellationNode {
  id: string;
  repoId: string;
  clusterId: string;
  label: string;
  x: number;
  y: number;
  radius: number;
  momentum: number;
}

export interface ConstellationCluster {
  id: string;
  label: string;
  x: number;
  y: number;
  radius: number;
}

export interface ConstellationLayout {
  clusters: ConstellationCluster[];
  nodes: ConstellationNode[];
}
