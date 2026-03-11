import type { MomentumInput, RepoMomentum } from "@/lib/domain/types";
import { daysBetween, normalizeRecentness } from "@/lib/domain/utils";

export function computeMomentumScore(input: MomentumInput): RepoMomentum {
  const starDelta7d = Math.max(
    0,
    (input.currentSnapshot?.stargazersCount ?? input.repo.stargazerCount) -
      (input.previousSnapshot?.stargazersCount ?? input.repo.stargazerCount)
  );
  const forkDelta30d = Math.max(
    0,
    (input.currentSnapshot?.forksCount ?? input.repo.forksCount) -
      (input.previousSnapshot?.forksCount ?? input.repo.forksCount)
  );
  const pushRecency = normalizeRecentness(daysBetween(input.now, input.repo.pushedAt), 30);
  const releaseRecency = normalizeRecentness(daysBetween(input.now, input.repo.lastReleaseAt), 60);
  const userTouch14d = Math.min(1, input.userTouchCount14d / 5);

  const score =
    0.35 * starDelta7d +
    0.15 * forkDelta30d +
    0.15 * pushRecency +
    0.15 * releaseRecency +
    0.2 * userTouch14d;

  return {
    repoId: input.repo.id,
    score: Number(score.toFixed(4)),
    starDelta7d,
    forkDelta30d,
    pushRecency,
    releaseRecency,
    userTouch14d,
  };
}
