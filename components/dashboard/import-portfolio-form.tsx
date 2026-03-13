"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { CheckCircle2, Download, RefreshCw, TriangleAlert } from "lucide-react";
import { clsx } from "clsx";
import { importStarredReposAction } from "@/app/dashboard/actions";

type ImportPortfolioFormProps = {
  mode?: "primary" | "secondary";
  className?: string;
};

export function ImportPortfolioForm({
  mode = "primary",
  className,
}: ImportPortfolioFormProps) {
  const [state, formAction] = useActionState(
    importStarredReposAction,
    { status: "idle" as const }
  );
  const router = useRouter();

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <div className={clsx("space-y-3", className)}>
      <form action={formAction}>
        <SubmitButton mode={mode} />
      </form>

      {state.status === "error" ? (
        <p className="rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
          <span className="inline-flex items-center gap-2 font-medium">
            <TriangleAlert className="h-4 w-4" />
            Import failed
          </span>
          <span className="mt-2 block text-rose-100/90">{state.message}</span>
        </p>
      ) : null}

      {state.status === "success" ? (
        <p className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100">
          <span className="inline-flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4" />
            Import complete
          </span>
          <span className="mt-2 block text-emerald-100/90">{state.message}</span>
        </p>
      ) : null}
    </div>
  );
}

function SubmitButton({ mode }: { mode: "primary" | "secondary" }) {
  const { pending } = useFormStatus();
  const isPrimary = mode === "primary";
  const Icon = pending ? RefreshCw : isPrimary ? Download : RefreshCw;

  return (
    <button
      type="submit"
      disabled={pending}
      className={clsx(
        "inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70",
        pending && "animate-pulse",
        isPrimary
          ? "bg-gradient-to-r from-cyan-300 via-sky-400 to-indigo-500 text-slate-950 hover:translate-y-[-1px]"
          : "border border-white/10 bg-white/[0.04] text-white hover:border-white/20 hover:bg-white/[0.08]"
      )}
    >
      <Icon className={clsx("h-4 w-4", pending && "animate-spin")} />
      {pending ? "Importing..." : isPrimary ? "Import starred repos" : "Reimport portfolio"}
    </button>
  );
}
