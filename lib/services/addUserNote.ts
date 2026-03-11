import type { Clock, PortfolioEventStore, UserNoteStore, UserRepoStateStore } from "@/lib/ports";
import type { UserNote } from "@/lib/domain/types";

export function createAddUserNoteService(deps: {
  noteStore: UserNoteStore;
  stateStore: UserRepoStateStore;
  eventStore: PortfolioEventStore;
  clock: Clock;
}) {
  return async function addUserNote(input: {
    noteId: string;
    userId: string;
    repoId: string;
    content: string;
  }): Promise<UserNote> {
    const timestamp = deps.clock.now();
    const note: UserNote = {
      id: input.noteId,
      userId: input.userId,
      repoId: input.repoId,
      content: input.content.trim(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await deps.noteStore.create(note);

    const currentState = await deps.stateStore.get(input.userId, input.repoId);
    if (currentState) {
      await deps.stateStore.save({
        ...currentState,
        noteCount: currentState.noteCount + 1,
        lastTouchedAt: timestamp,
      });
    }

    await deps.eventStore.append([
      {
        id: `evt-note-${input.noteId}`,
        userId: input.userId,
        repoId: input.repoId,
        type: "note_added",
        occurredAt: timestamp,
        payload: { contentLength: note.content.length },
      },
    ]);

    return note;
  };
}
