import Link from "next/link";
import { ArrowRight, Clock4, Radar } from "lucide-react";
import { AppChrome } from "@/components/layout/app-chrome";
import { SectionCard } from "@/components/layout/section-card";
import { AnimatedValue } from "@/components/charts/animated-value";
import { Sparkline } from "@/components/charts/sparkline";
import { StateRing } from "@/components/charts/state-ring";
import { ConstellationPreview } from "@/components/charts/constellation-preview";
import {
  demoClusters,
  demoEvents,
  demoMomentumTimeline,
  getOverviewMetrics,
  getTopMomentumRepos,
} from "@/lib/demo/data";

export default function HomePage() {
  const overview = getOverviewMetrics();
  const topRepos = getTopMomentumRepos(3);

  return (
    <AppChrome
      eyebrow="Portfolio observability"
      title="See the shape of your starred universe before it slips out of reach."
      subtitle="ghars turns GitHub stars into a living control room. Follow cluster drift, spot heat, recover forgotten repos, and attach memory to the things you actually mean to build with."
      badge="Demo portfolio"
    >
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard
          eyebrow="Now"
          title="A dashboard first product, not a nicer bookmarks list"
          description="The front page should already tell you what kind of technical person you have been this month."
          action={
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.08]"
            >
              Open dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          }
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[
              { label: "Imported stars", value: overview.total, suffix: "", tone: "text-white" },
              { label: "Annotated", value: overview.annotated, suffix: "", tone: "text-cyan-200" },
              { label: "Started", value: overview.started, suffix: "", tone: "text-amber-200" },
              { label: "Watching", value: overview.watching, suffix: "", tone: "text-emerald-200" },
              { label: "Parked", value: overview.parked, suffix: "", tone: "text-violet-200" },
              { label: "Neglected", value: overview.neglected, suffix: "", tone: "text-rose-200" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-[1.6rem] border border-white/8 bg-slate-950/45 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
              >
                <p className="text-[0.72rem] uppercase tracking-[0.24em] text-slate-400">{item.label}</p>
                <AnimatedValue value={item.value} className={`mt-3 block text-4xl font-semibold ${item.tone}`} />
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
            <div className="rounded-[1.8rem] border border-cyan-300/12 bg-gradient-to-br from-cyan-300/10 via-sky-400/8 to-transparent p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[0.7rem] uppercase tracking-[0.24em] text-cyan-100/70">Weekly pulse</p>
                  <h3 className="mt-1 text-lg font-semibold text-white">Momentum across the last seven days</h3>
                </div>
                <Radar className="h-5 w-5 text-cyan-200" />
              </div>
              <div className="mt-4 h-40">
                <Sparkline points={demoMomentumTimeline.map((point) => point.value)} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {demoMomentumTimeline.map((point) => (
                  <span
                    key={point.label}
                    className="rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1 text-[0.7rem] uppercase tracking-[0.18em] text-slate-300"
                  >
                    {point.label} {point.value}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-[1.8rem] border border-white/8 bg-slate-950/45 p-4">
              <div className="flex items-center gap-3">
                <Clock4 className="h-5 w-5 text-amber-200" />
                <div>
                  <p className="text-[0.7rem] uppercase tracking-[0.24em] text-amber-100/70">Cluster weight</p>
                  <h3 className="text-lg font-semibold text-white">Where attention is concentrating</h3>
                </div>
              </div>
              <div className="mt-4">
                <StateRing
                  segments={demoClusters.map((cluster) => ({
                    label: cluster.name,
                    value: cluster.repoCount,
                    color: cluster.accent,
                  }))}
                />
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Signature surface"
          title="Constellation preview"
          description="One visual statement, one use. The 3D surface is reserved for seeing cluster gravity and heat, not for routine navigation."
        >
          <ConstellationPreview items={topRepos.map((repo) => ({ cluster: repo.cluster, importance: repo.importance, momentum: repo.momentum }))} />
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {topRepos.map((repo) => (
              <div key={repo.fullName} className="rounded-[1.4rem] border border-white/8 bg-white/[0.025] p-3">
                <p className="text-[0.65rem] uppercase tracking-[0.24em] text-slate-400">{repo.cluster}</p>
                <p className="mt-1 font-medium text-white">{repo.fullName}</p>
                <p className="mt-2 text-sm text-slate-300/80">{repo.summary}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard
          eyebrow="Active heat"
          title="Repos pulling the portfolio forward"
          description="These are not just popular. They are moving, and you are touching them."
        >
          <div className="space-y-4">
            {topRepos.map((repo, index) => (
              <Link
                key={repo.fullName}
                href={`/repo/${repo.owner}/${repo.name}`}
                className="flex items-center justify-between gap-4 rounded-[1.6rem] border border-white/8 bg-white/[0.03] px-4 py-4 transition hover:border-cyan-300/25"
              >
                <div className="flex items-center gap-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.05] text-sm font-semibold text-slate-300">
                    0{index + 1}
                  </span>
                  <div>
                    <p className="text-sm uppercase tracking-[0.24em] text-slate-400">{repo.cluster}</p>
                    <p className="text-lg font-semibold text-white">{repo.fullName}</p>
                    <p className="text-sm text-slate-300/80">{repo.summary}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[0.7rem] uppercase tracking-[0.22em] text-cyan-100/70">Momentum</p>
                  <p className="mt-1 text-2xl font-semibold text-cyan-100">{repo.momentum}</p>
                </div>
              </Link>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Signal tape"
          title="Recent changes and human context"
          description="This should feel like the top of an instrument panel, not a changelog."
          action={
            <Link
              href="/reports"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/20 hover:bg-white/[0.07]"
            >
              Weekly reports
              <ArrowRight className="h-4 w-4" />
            </Link>
          }
        >
          <div className="space-y-3">
            {demoEvents.map((event) => (
              <div
                key={`${event.repo}-${event.timestamp}`}
                className="rounded-[1.6rem] border border-white/8 bg-white/[0.025] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-[0.24em] text-slate-400">{event.type}</p>
                    <h3 className="mt-1 font-semibold text-white">{event.title}</h3>
                    <p className="mt-2 text-sm text-slate-300/80">{event.detail}</p>
                  </div>
                  <div className="text-right text-xs uppercase tracking-[0.18em] text-slate-500">
                    <p>{event.repo}</p>
                    <p className="mt-1">{new Date(event.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </AppChrome>
  );
}
