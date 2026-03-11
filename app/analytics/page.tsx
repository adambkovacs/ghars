import { AppChrome } from "@/components/layout/app-chrome";
import { SectionCard } from "@/components/layout/section-card";
import { ConstellationPreview } from "@/components/charts/constellation-preview";
import { DriftChart } from "@/components/charts/drift-chart";
import { Sparkline } from "@/components/charts/sparkline";
import { demoClusters, demoDriftSeries, demoRepos, getTopMomentumRepos } from "@/lib/demo/data";

export default function AnalyticsPage() {
  const topRepos = getTopMomentumRepos(8);

  return (
    <AppChrome
      eyebrow="Analytics"
      title="Structure, drift, and heat"
      subtitle="These views are allowed to be cinematic, but only if they still make better decisions possible after the first ten seconds."
      badge="Stunning by design"
    >
      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard
          eyebrow="Flagship"
          title="Constellation map"
          description="A living star field where cluster gravity, repo importance, and motion all sit in one frame."
        >
          <ConstellationPreview
            items={topRepos.map((repo) => ({
              cluster: repo.cluster,
              importance: repo.importance,
              momentum: repo.momentum,
            }))}
          />
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            {demoClusters.map((cluster) => (
              <div key={cluster.slug} className="rounded-[1.3rem] border border-white/8 bg-white/[0.025] p-3">
                <p className="font-medium text-white">{cluster.name}</p>
                <p className="mt-1 text-sm text-slate-300/75">{cluster.repoCount} repos</p>
                <p className="mt-1 text-sm text-slate-300/75">Momentum {cluster.momentum}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Drift"
          title="Theme migration"
          description="Your stars are telling a story about what moved from curiosity into intent."
        >
          <DriftChart rows={demoDriftSeries} />
        </SectionCard>
      </div>

      <SectionCard
        eyebrow="Heat matrix"
        title="Momentum by repo"
        description="A dense but readable table of live-ish signal. Each band should feel like a pulse, not a spreadsheet."
      >
        <div className="grid gap-4 xl:grid-cols-2">
          {demoRepos.map((repo) => (
            <article key={repo.fullName} className="rounded-[1.6rem] border border-white/8 bg-white/[0.025] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[0.7rem] uppercase tracking-[0.22em] text-slate-400">{repo.cluster}</p>
                  <h3 className="mt-1 text-lg font-semibold text-white">{repo.fullName}</h3>
                  <p className="mt-2 text-sm text-slate-300/80">{repo.summary}</p>
                </div>
                <div className="text-right">
                  <p className="text-[0.68rem] uppercase tracking-[0.2em] text-slate-400">score</p>
                  <p className="text-2xl font-semibold text-cyan-100">{repo.momentum}</p>
                </div>
              </div>
              <div className="mt-4 h-24">
                <Sparkline points={repo.sparkline} />
              </div>
            </article>
          ))}
        </div>
      </SectionCard>
    </AppChrome>
  );
}
