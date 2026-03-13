"use client";

import { useActionState } from "react";
import type { RepoState } from "@/lib/domain/types";
import type { RepoMutationActionState } from "@/app/repo/[owner]/[name]/actions";

type RepoStateFormProps = {
  repoFullName: string;
  currentState: RepoState;
  compact?: boolean;
  action: (
    state: RepoMutationActionState,
    formData: FormData
  ) => Promise<RepoMutationActionState>;
};

const initialState: RepoMutationActionState = {
  status: "idle",
};

const stateOptions: RepoState[] = ["saved", "watching", "started", "parked"];

export function RepoStateForm({ repoFullName, currentState, compact = false, action }: RepoStateFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form
      action={formAction}
      className={
        compact
          ? "rounded-[1.2rem] border border-white/8 bg-white/[0.025] p-3"
          : "rounded-[1.5rem] border border-white/8 bg-white/[0.025] p-4"
      }
    >
      <input type="hidden" name="repoFullName" value={repoFullName} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[0.68rem] uppercase tracking-[0.2em] text-slate-400">Current state</p>
          <p className={`mt-2 ${compact ? "text-xs" : "text-sm"} text-slate-300/82`}>
            Change how this repo behaves across search, analytics, and reports.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {stateOptions.map((option) => {
            const active = option === currentState;
            return (
              <button
                key={option}
                type="submit"
                name="nextState"
                value={option}
                disabled={pending && active}
                className={`rounded-full border ${compact ? "px-2.5 py-1 text-[0.65rem]" : "px-3 py-1.5 text-xs"} font-semibold uppercase tracking-[0.18em] transition ${
                  active
                    ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-100"
                    : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20 hover:text-white"
                } disabled:cursor-not-allowed disabled:opacity-70`}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>
      {!compact ? (
        <p
          className={`mt-3 text-sm ${
            state.status === "error"
              ? "text-rose-200"
              : state.status === "success"
                ? "text-emerald-200"
                : "text-slate-400"
          }`}
        >
          {state.message ?? `Currently tracked as ${currentState}.`}
        </p>
      ) : null}
    </form>
  );
}
