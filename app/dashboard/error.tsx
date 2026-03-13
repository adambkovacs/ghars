"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCw } from "lucide-react";
import { AppChrome } from "@/components/layout/app-chrome";
import { SectionCard } from "@/components/layout/section-card";

type DashboardErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  useEffect(() => {
    console.error("Dashboard render failed", error);
  }, [error]);

  return (
    <AppChrome
      eyebrow="Dashboard"
      title="Dashboard failed to load"
      subtitle="ghars hit a server-side failure while loading the authenticated portfolio surface."
      badge="Retry required"
    >
      <SectionCard
        eyebrow="Failure"
        title="The import or portfolio read did not complete cleanly"
        description="This route now catches dashboard failures instead of dropping you into the generic application error screen."
        action={<AlertTriangle className="h-5 w-5 text-amber-200" />}
      >
        <div className="space-y-4 text-sm text-slate-300/82">
          <p>
            {error.message || "A server-side dashboard error occurred."}
          </p>
          {error.digest ? <p>Digest: {error.digest}</p> : null}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-300 via-sky-400 to-indigo-500 px-5 py-3 font-semibold text-slate-950 transition hover:translate-y-[-1px]"
            >
              <RotateCw className="h-4 w-4" />
              Retry dashboard
            </button>
            <Link
              href="/sign-in"
              className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.08]"
            >
              Re-authenticate
            </Link>
          </div>
        </div>
      </SectionCard>
    </AppChrome>
  );
}
