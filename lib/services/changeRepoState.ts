import type { Clock, PortfolioEventStore, UserRepoStateStore } from "@/lib/ports";
import type { RepoState, UserRepoState } from "@/lib/domain/types";

export function createChangeRepoStateService(deps: {
  stateStore: UserRepoStateStore;
  eventStore: PortfolioEventStore;
  clock: Clock;
}) {
  return async function changeRepoState(input: {
    userId: string;
    repoId: string;
    nextState: RepoState;
  }): Promise<UserRepoState> {
    const current = await deps.stateStore.get(input.userId, input.repoId);
    if (!current) {
      throw new Error(`Missing repo state for ${input.userId}:${input.repoId}`);
    }

    const changedAt = deps.clock.now();
    const updated: UserRepoState = {
      ...current,
      state: input.nextState,
      lastTouchedAt: changedAt,
    };

    await deps.stateStore.save(updated);
    await deps.eventStore.append([
      {
        id: `evt-state-${input.userId}-${input.repoId}-${changedAt.toISOString()}`,
        userId: input.userId,
        repoId: input.repoId,
        type: "state_changed",
        occurredAt: changedAt,
        payload: { from: current.state, to: input.nextState },
      },
    ]);

    return updated;
  };
}
