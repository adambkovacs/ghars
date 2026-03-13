import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppChrome } from "@/components/layout/app-chrome";
import { SectionCard } from "@/components/layout/section-card";
import { ConstellationPreview } from "@/components/charts/constellation-preview";
import { DriftChart } from "@/components/charts/drift-chart";
import { getPortfolioRuntime } from "@/lib/server/portfolio/runtime";

export default async function AnalyticsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const analytics = await getPortfolioRuntime().getAnalyticsModel(session.user.id);

  return (
    <AppChrome
      eyebrow="Analytics"
      title="Structure, drift, and heat"
      subtitle={
        analytics.hasImport
          ? `Live imported portfolio signals${analytics.githubLogin ? ` for ${analytics.githubLogin}` : ""}. No fake history, no demo fixtures.`
          : "Import your stars first, then the analytics surfaces will render from your own portfolio."
      }
      badge={analytics.hasImport ? "Live imported analytics" : "Awaiting first import"}
    >
      {!analytics.hasImport ? (
        <SectionCard
          eyebrow="Onboarding"
          title="Analytics unlock after the first import"
          description="This page now waits for your imported portfolio instead of falling back to a demo dataset."
        >
          <Link
            href="/dashboard"
            className="inline-flex items-center rounded-full bg-gradient-to-r from-cyan-300 via-sky-400 to-indigo-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:translate-y-[-1px]"
          >
            Go to dashboard import
          </Link>
        </SectionCard>
      ) : (
        <>
          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <SectionCard
              eyebrow="Flagship"
              title="Constellation map"
              description="A live star field built from your imported repo clusters and current momentum ranking."
            >
              <ConstellationPreview items={analytics.constellationItems} />
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                {analytics.clusters.map((cluster) => (
                  <div key={cluster.id} className="rounded-[1.3rem] border border-white/8 bg-white/[0.025] p-3">
                    <p className="font-medium text-white">{cluster.label}</p>
                    <p className="mt-1 text-sm text-slate-300/75">{cluster.repoCount} repos</p>
                    <p className="mt-1 text-sm text-slate-300/75">Average momentum {cluster.averageMomentum.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard
              eyebrow="Drift"
              title="Theme migration"
              description="Topic concentration over time based on when you actually starred these repositories."
            >
              <DriftChart rows={analytics.driftRows} />
            </SectionCard>
          </div>

          <SectionCard
            eyebrow="Heat matrix"
            title="Momentum by repo"
            description="A live ranking built from recent user touch plus upstream recency. Historical deltas stay zero until snapshot refresh is wired."
          >
            <div className="grid gap-4 xl:grid-cols-2">
              {analytics.topRepos.map((repo) => (
                <article key={repo.fullName} className="rounded-[1.6rem] border border-white/8 bg-white/[0.025] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[0.7rem] uppercase tracking-[0.22em] text-slate-400">{repo.reasons.join(" · ")}</p>
                      <h3 className="mt-1 text-lg font-semibold text-white">{repo.fullName}</h3>
                      <p className="mt-2 text-sm text-slate-300/80">
                        {repo.language ?? "Unknown language"} · {repo.state} · {repo.noteCount} notes
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[0.68rem] uppercase tracking-[0.2em] text-slate-400">score</p>
                      <p className="text-2xl font-semibold text-cyan-100">{repo.momentumScore.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-[1.4rem] border border-white/8 bg-slate-950/45 px-3 py-3 text-sm text-slate-200/85">
                      <p className="text-[0.68rem] uppercase tracking-[0.2em] text-slate-400">Stars</p>
                      <p className="mt-2">{repo.stars.toLocaleString()}</p>
                    </div>
                    <div className="rounded-[1.4rem] border border-white/8 bg-slate-950/45 px-3 py-3 text-sm text-slate-200/85">
                      <p className="text-[0.68rem] uppercase tracking-[0.2em] text-slate-400">Last touched</p>
                      <p className="mt-2">{repo.lastTouchedAt ? repo.lastTouchedAt.toLocaleDateString("en-US") : "Unknown"}</p>
                    </div>
                    <div className="rounded-[1.4rem] border border-white/8 bg-slate-950/45 px-3 py-3 text-sm text-slate-200/85">
                      <p className="text-[0.68rem] uppercase tracking-[0.2em] text-slate-400">Last pushed</p>
                      <p className="mt-2">{repo.pushedAt ? repo.pushedAt.toLocaleDateString("en-US") : "Unknown"}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </SectionCard>
        </>
      )}
    </AppChrome>
  );
}
