import type { NeglectSignal, PortfolioEvent, UserNote, UserRepoState } from "../domain/types";
import { daysBetween } from "../domain/utils";

export function generateNeglectSignals(input: {
  now: Date;
  states: UserRepoState[];
  notes: UserNote[];
  events: PortfolioEvent[];
}): NeglectSignal[] {
  const notesByRepo = new Map<string, number>();
  const recentTouchByRepo = new Map<string, Date>();

  for (const note of input.notes) {
    notesByRepo.set(note.repoId, (notesByRepo.get(note.repoId) ?? 0) + 1);
  }

  for (const event of input.events) {
    if (event.type === "repo_refreshed") {
      continue;
    }

    const current = recentTouchByRepo.get(event.repoId);
    if (!current || current < event.occurredAt) {
      recentTouchByRepo.set(event.repoId, event.occurredAt);
    }
  }

  return input.states
    .flatMap((state) => {
      const noteCount = notesByRepo.get(state.repoId) ?? 0;
      const hasCommitment = state.state === "started" || noteCount > 0;
      if (!hasCommitment) {
        return [];
      }

      const lastTouch = recentTouchByRepo.get(state.repoId) ?? state.lastTouchedAt ?? state.starredAt;
      const days = daysBetween(input.now, lastTouch);
      if (days < 21) {
        return [];
      }

      const reasons = [state.state === "started" ? "started but quiet" : "annotated but quiet"];
      if (days >= 45) {
        reasons.push("cold for 45+ days");
      }

      return [
        {
          repoId: state.repoId,
          score: Number((days / 21 + (state.state === "started" ? 0.5 : 0.25)).toFixed(2)),
          reasons,
        } satisfies NeglectSignal,
      ];
    })
    .sort((left, right) => right.score - left.score);
}
