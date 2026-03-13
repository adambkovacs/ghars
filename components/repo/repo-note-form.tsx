"use client";

import { useActionState, useEffect, useRef } from "react";
import type { RepoMutationActionState } from "@/app/repo/[owner]/[name]/actions";

type RepoNoteFormProps = {
  repoFullName: string;
  action: (
    state: RepoMutationActionState,
    formData: FormData
  ) => Promise<RepoMutationActionState>;
};

const initialState: RepoMutationActionState = {
  status: "idle",
};

export function RepoNoteForm({ repoFullName, action }: RepoNoteFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state.status]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3 rounded-[1.5rem] border border-white/8 bg-white/[0.025] p-4">
      <input type="hidden" name="repoFullName" value={repoFullName} />
      <label className="block">
        <span className="text-[0.68rem] uppercase tracking-[0.2em] text-slate-400">Add note</span>
        <textarea
          name="content"
          rows={4}
          placeholder="What did you notice, why did you star it, what should future-you remember?"
          className="mt-3 w-full rounded-[1.25rem] border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
        />
      </label>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p
          className={`text-sm ${
            state.status === "error"
              ? "text-rose-200"
              : state.status === "success"
                ? "text-emerald-200"
                : "text-slate-400"
          }`}
        >
          {state.message ?? "Each note writes back into your personal portfolio memory trail."}
        </p>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-gradient-to-r from-cyan-300 via-sky-400 to-indigo-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Saving..." : "Save note"}
        </button>
      </div>
    </form>
  );
}
