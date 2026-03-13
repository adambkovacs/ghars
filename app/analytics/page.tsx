import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppChrome } from "@/components/layout/app-chrome";
import { SectionCard } from "@/components/layout/section-card";
import { ConstellationPreview } from "@/components/charts/constellation-preview";
import { DriftChart } from "@/components/charts/drift-chart";
import { Sparkline } from "@/components/charts/sparkline";
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
      viewerLabel={analytics.githubLogin ?? session.githubLogin ?? session.user.name ?? session.user.id}
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
            description="A live ranking built from recent user touch, upstream movement, and stored portfolio snapshots."
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
                  <div className="mt-4 grid gap-3 md:grid-cols-[1fr_220px]">
                    <div className="rounded-[1.4rem] border border-white/8 bg-slate-950/45 p-3">
                      <p className="text-[0.68rem] uppercase tracking-[0.2em] text-slate-400">Snapshot trend</p>
                      <div className="mt-3 h-20">
                        <Sparkline values={repo.trend.length > 0 ? repo.trend : [repo.stars]} />
                      </div>
                    </div>
                    <div className="rounded-[1.4rem] border border-white/8 bg-slate-950/45 px-3 py-3 text-sm text-slate-200/85">
                      <p className="text-[0.68rem] uppercase tracking-[0.2em] text-slate-400">Deltas</p>
                      <p className="mt-2">Stars +{repo.starDelta7d}</p>
                      <p className="mt-1">Forks +{repo.forkDelta30d}</p>
                      <p className="mt-1">{repo.trend.length} points</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </SectionCard>

          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <SectionCard
              eyebrow="Coverage"
              title="Portfolio coverage"
              description="This is the truth layer: how much of the portfolio is actually curated, annotated, and README-enriched."
            >
              <div className="grid gap-3 md:grid-cols-2">
                {analytics.coverage.map((metric) => (
                  <div key={metric.id} className="rounded-[1.5rem] border border-white/8 bg-white/[0.025] p-4">
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="text-[0.68rem] uppercase tracking-[0.2em] text-slate-400">{metric.label}</p>
                        <p className="mt-2 text-3xl font-semibold text-white">{metric.percentage}%</p>
                      </div>
                      <p className="text-sm text-slate-300/78">
                        {metric.count}/{metric.total}
                      </p>
                    </div>
                    <p className="mt-3 text-sm text-slate-300/78">{metric.summary}</p>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard
              eyebrow="Activity"
              title="Recent portfolio activity"
              description="Recent touches, refreshes, and state changes. This is the living audit log behind the dashboard."
            >
              <div className="space-y-3">
                {analytics.recentActivity.length > 0 ? (
                  analytics.recentActivity.map((event) => (
                    <article key={event.id} className="rounded-[1.5rem] border border-white/8 bg-white/[0.025] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-white">{event.repoFullName}</p>
                          <p className="mt-1 text-sm text-slate-300/78">{event.summary}</p>
                        </div>
                        <div className="text-right text-xs uppercase tracking-[0.18em] text-slate-500">
                          <p>{event.type.replaceAll("_", " ")}</p>
                          <p className="mt-2 normal-case tracking-normal">
                            {event.occurredAt.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="rounded-[1.5rem] border border-dashed border-white/12 bg-white/[0.02] p-4 text-sm text-slate-300/75">
                    Activity will appear here once the portfolio accrues notes, state changes, and scheduled refreshes.
                  </div>
                )}
              </div>
            </SectionCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <SectionCard
              eyebrow="Act now"
              title="Opportunity queue"
              description="High-signal repos that still lack your own note or decision. This is the best place to turn motion into action."
            >
              <div className="space-y-3">
                {analytics.opportunities.length > 0 ? (
                  analytics.opportunities.map((repo) => (
                    <article key={repo.fullName} className="rounded-[1.5rem] border border-white/8 bg-white/[0.025] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-white">{repo.fullName}</p>
                          <p className="mt-1 text-sm text-slate-300/80">
                            {repo.language ?? "Unknown language"} · {repo.state} · score {repo.momentumScore.toFixed(2)}
                          </p>
                          <p className="mt-3 text-sm text-slate-200/82">
                            {repo.readmeSummary ?? "README enrichment pending. Use repo detail to pull in upstream context."}
                          </p>
                        </div>
                        <div className="text-right text-sm text-cyan-100">
                          <p>+{repo.starDelta7d} stars</p>
                        </div>
                      </div>
                      <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">{repo.reasons.join(" · ")}</p>
                    </article>
                  ))
                ) : (
                  <div className="rounded-[1.5rem] border border-dashed border-white/12 bg-white/[0.02] p-4 text-sm text-slate-300/75">
                    No obvious action queue right now. That usually means the portfolio is either well-annotated or cold.
                  </div>
                )}
              </div>
            </SectionCard>

            <SectionCard
              eyebrow="Recover context"
              title="Neglect queue"
              description="Repos that once mattered enough to touch, note, or start, but have since gone stale."
            >
              <div className="space-y-3">
                {analytics.neglectQueue.length > 0 ? (
                  analytics.neglectQueue.map((repo) => (
                    <article key={repo.fullName} className="rounded-[1.5rem] border border-white/8 bg-white/[0.025] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-white">{repo.fullName}</p>
                          <p className="mt-1 text-sm text-slate-300/80">
                            {repo.state} · {repo.noteCount} notes · neglect {repo.neglectScore.toFixed(2)}
                          </p>
                        </div>
                        <p className="text-right text-sm text-slate-300/75">
                          {repo.lastTouchedAt ? repo.lastTouchedAt.toLocaleDateString("en-US") : "Unknown touch"}
                        </p>
                      </div>
                      <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">{repo.reasons.join(" · ")}</p>
                    </article>
                  ))
                ) : (
                  <div className="rounded-[1.5rem] border border-dashed border-white/12 bg-white/[0.02] p-4 text-sm text-slate-300/75">
                    No neglect hotspots detected right now.
                  </div>
                )}
              </div>
            </SectionCard>
          </div>
        </>
      )}
    </AppChrome>
  );
}
