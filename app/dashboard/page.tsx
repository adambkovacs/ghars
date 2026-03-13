import { redirect } from "next/navigation";
import { Activity, Download, RefreshCw } from "lucide-react";
import { auth } from "@/auth";
import { AppChrome } from "@/components/layout/app-chrome";
import { SectionCard } from "@/components/layout/section-card";
import { AnimatedValue } from "@/components/charts/animated-value";
import { StateRing } from "@/components/charts/state-ring";
import { ImportPortfolioForm } from "@/components/dashboard/import-portfolio-form";
import { appEnv } from "@/lib/env/app-env";
import { getPortfolioRuntime } from "@/lib/server/portfolio/runtime";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const dashboard = await getPortfolioRuntime().getDashboardModel(session.user.id);
  const badge = dashboard.lastSyncedAt
    ? `Updated ${dashboard.lastSyncedAt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`
    : "Awaiting first import";

  return (
    <AppChrome
      eyebrow="Dashboard"
      title="Your GitHub stars as a living portfolio"
      subtitle="This surface is now driven by the signed-in user context. Import your stars, then use the rest of the product against real portfolio data instead of demo fixtures."
      badge={badge}
      viewerLabel={dashboard.githubLogin ?? session.githubLogin ?? session.user.name ?? session.user.id}
    >
      {!dashboard.hasImport ? (
        <SectionCard
          eyebrow="Onboarding"
          title="Import your starred repos"
          description="The product is empty on purpose until it has your own GitHub portfolio to work with."
          action={<Download className="h-5 w-5 text-cyan-200" />}
        >
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <p className="text-sm leading-6 text-slate-300/82">
                Signed in as <span className="font-semibold text-white">{dashboard.githubLogin ?? session.githubLogin ?? session.user.name ?? session.user.id}</span>.
              </p>
              <p className="text-sm leading-6 text-slate-300/82">
                Press the import button once and ghars will fetch your starred repositories, write them into the portfolio store, and switch this dashboard over to live data.
              </p>
              <ImportPortfolioForm />
            </div>

            <div className="rounded-[1.7rem] border border-white/8 bg-white/[0.03] p-5">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-slate-400">Current auth state</p>
              <div className="mt-4 space-y-3 text-sm text-slate-300/82">
                <p>Session user id: {session.user.id}</p>
                <p>GitHub login: {dashboard.githubLogin ?? session.githubLogin ?? "unknown"}</p>
                <p>GitHub token present: {session.accessToken ? "yes" : "no"}</p>
                <p>Convex configured: {appEnv.isConvexConfigured ? "yes" : "no"}</p>
              </div>
            </div>
          </div>
        </SectionCard>
      ) : (
        <>
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <SectionCard
              eyebrow="Portfolio overview"
              title="Import complete"
              description={`${dashboard.metrics.totalStars} repos synced for ${dashboard.githubLogin ?? session.githubLogin ?? "this account"}.`}
              action={<Activity className="h-5 w-5 text-emerald-200" />}
            >
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {[
                  ["Imported", dashboard.metrics.totalStars, "text-white"],
                  ["Annotated", dashboard.metrics.annotatedCount, "text-cyan-200"],
                  ["Started", dashboard.metrics.startedCount, "text-amber-200"],
                  ["Watching", dashboard.metrics.watchingCount, "text-emerald-200"],
                  ["Parked", dashboard.metrics.parkedCount, "text-violet-200"],
                  ["Neglected", dashboard.metrics.neglectedCount, "text-rose-200"],
                ].map(([label, value, tone]) => (
                  <div key={label} className="rounded-[1.5rem] border border-white/8 bg-slate-950/45 p-4">
                    <p className="text-[0.72rem] uppercase tracking-[0.24em] text-slate-400">{label}</p>
                    <AnimatedValue value={Number(value)} className={`mt-3 block text-4xl font-semibold ${tone}`} />
                  </div>
                ))}
              </div>

              <div className="mt-5">
                <StateRing
                  segments={[
                    { label: "Saved", value: dashboard.metrics.stateDistribution.saved, color: "#67e8f9" },
                    { label: "Started", value: dashboard.metrics.stateDistribution.started, color: "#fdba74" },
                    { label: "Watching", value: dashboard.metrics.stateDistribution.watching, color: "#34d399" },
                    { label: "Parked", value: dashboard.metrics.stateDistribution.parked, color: "#c084fc" },
                  ]}
                />
              </div>
            </SectionCard>

            <SectionCard
              eyebrow="Sync"
              title="Refresh the import"
              description="The import slice is live. Re-run it any time to reconcile your starred repo portfolio."
              action={<RefreshCw className="h-5 w-5 text-cyan-200" />}
            >
              <div className="space-y-4 text-sm text-slate-300/82">
                <p>Last sync: {dashboard.lastSyncedAt?.toLocaleString("en-US") ?? "Unknown"}</p>
                <p>GitHub login: {dashboard.githubLogin ?? session.githubLogin ?? "unknown"}</p>
                <ImportPortfolioForm mode="secondary" />
              </div>
            </SectionCard>
          </div>

          <SectionCard
            eyebrow="Recent stars"
            title="Newest imported repos"
            description="This list is coming from the imported portfolio snapshot, not the demo dataset."
          >
            <div className="space-y-3">
              {dashboard.recentRepos.map((repo) => (
                <article key={repo.fullName} className="rounded-[1.5rem] border border-white/8 bg-white/[0.025] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{repo.fullName}</h3>
                      <p className="mt-2 text-sm text-slate-300/80">{repo.description}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {repo.topics.map((topic) => (
                          <span
                            key={topic}
                            className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-slate-300"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="text-right text-sm text-slate-300/80">
                      <p className="text-[0.68rem] uppercase tracking-[0.2em] text-slate-400">{repo.state}</p>
                      <p className="mt-1">{repo.language ?? "Unknown language"}</p>
                      <p className="mt-1">{repo.stars.toLocaleString()} stars</p>
                      <p className="mt-1">{repo.starredAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
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
