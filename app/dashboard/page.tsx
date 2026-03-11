import Link from "next/link";
import { ArrowRight, Eye, Flame, Orbit } from "lucide-react";
import { AppChrome } from "@/components/layout/app-chrome";
import { SectionCard } from "@/components/layout/section-card";
import { AnimatedValue } from "@/components/charts/animated-value";
import { Sparkline } from "@/components/charts/sparkline";
import { StateRing } from "@/components/charts/state-ring";
import { DriftChart } from "@/components/charts/drift-chart";
import {
  demoClusters,
  demoDriftSeries,
  demoReports,
  getHealthRows,
  getOverviewMetrics,
  getTopMomentumRepos,
} from "@/lib/demo/data";

export default function DashboardPage() {
  const overview = getOverviewMetrics();
  const topRepos = getTopMomentumRepos(4);
  const healthRows = getHealthRows();

  return (
    <AppChrome
      eyebrow="Dashboard"
      title="Your GitHub stars as a living portfolio"
      subtitle="The home surface is built to explain structure first, then motion, then action. Every score should resolve into evidence."
      badge="Updated 8 min ago"
    >
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard
          eyebrow="Portfolio overview"
          title="Macro state"
          description="Quick counts, but treated as instrumentation, not vanity."
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[
              ["Imported", overview.total, "text-white"],
              ["Annotated", overview.annotated, "text-cyan-200"],
              ["Started", overview.started, "text-amber-200"],
              ["Watching", overview.watching, "text-emerald-200"],
              ["Parked", overview.parked, "text-violet-200"],
              ["Neglected", overview.neglected, "text-rose-200"],
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
                { label: "Saved", value: overview.total - overview.started - overview.watching - overview.parked, color: "#67e8f9" },
                { label: "Started", value: overview.started, color: "#fdba74" },
                { label: "Watching", value: overview.watching, color: "#34d399" },
                { label: "Parked", value: overview.parked, color: "#c084fc" },
              ]}
            />
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Reporting drawer"
          title="Narrative snapshots"
          description="A dashboard becomes sticky when it can tell you what changed, not just show that something moved."
        >
          <div className="space-y-3">
            {demoReports.map((report) => (
              <article key={report.slug} className="rounded-[1.6rem] border border-white/8 bg-white/[0.025] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-[0.22em] text-slate-400">{report.cadence}</p>
                    <h3 className="text-lg font-semibold text-white">{report.title}</h3>
                  </div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    {new Date(report.generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                </div>
                <p className="mt-3 text-sm text-slate-300/80">{report.summary}</p>
                <Link href="/reports" className="mt-4 inline-flex items-center gap-2 text-sm text-cyan-100 transition hover:text-white">
                  Read report
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <SectionCard
          eyebrow="Momentum strip"
          title="What is heating up"
          description="Weighted by repo activity and your own touches."
          action={<Flame className="h-5 w-5 text-orange-300" />}
        >
          <div className="space-y-4">
            {topRepos.map((repo) => (
              <Link
                key={repo.fullName}
                href={`/repo/${repo.owner}/${repo.name}`}
                className="grid gap-3 rounded-[1.6rem] border border-white/8 bg-white/[0.025] p-4 md:grid-cols-[1fr_220px] md:items-end"
              >
                <div>
                  <p className="text-[0.7rem] uppercase tracking-[0.22em] text-slate-400">{repo.cluster}</p>
                  <h3 className="mt-1 text-lg font-semibold text-white">{repo.fullName}</h3>
                  <p className="mt-2 text-sm text-slate-300/80">{repo.summary}</p>
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
                <div className="space-y-2">
                  <div className="flex items-end justify-between text-xs uppercase tracking-[0.2em] text-slate-400">
                    <span>Momentum {repo.momentum}</span>
                    <span>{repo.starDelta7d} stars / 7d</span>
                  </div>
                  <div className="h-24">
                    <Sparkline points={repo.sparkline} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Temporal drift"
          title="Where the portfolio is leaning"
          description="Clusters should feel like weather systems. This view shows how they gained or lost gravity."
          action={<Orbit className="h-5 w-5 text-cyan-200" />}
        >
          <DriftChart rows={demoDriftSeries} />
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <SectionCard
          eyebrow="Portfolio health"
          title="What needs either context or closure"
          description="A healthy portfolio is not one with zero neglect, it is one where neglect is understood."
          action={<Eye className="h-5 w-5 text-amber-200" />}
        >
          <div className="space-y-3">
            {healthRows.map((row) => (
              <div key={row.fullName} className="rounded-[1.5rem] border border-white/8 bg-white/[0.025] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{row.fullName}</p>
                    <p className="mt-1 text-sm text-slate-300/80">{row.issue}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[0.68rem] uppercase tracking-[0.2em] text-slate-400">{row.state}</p>
                    <p className="mt-1 text-2xl font-semibold text-rose-200">{row.neglect}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Cluster mix"
          title="Concentration by theme"
          description="The dashboard should reveal if your star habits are focused or diffused."
        >
          <div className="grid gap-4 md:grid-cols-2">
            {demoClusters.map((cluster) => (
              <article
                key={cluster.slug}
                className="rounded-[1.6rem] border border-white/8 bg-white/[0.025] p-4"
              >
                <div className={`inline-flex rounded-full bg-gradient-to-r px-3 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.24em] text-slate-950 ${cluster.hue}`}>
                  {cluster.name}
                </div>
                <p className="mt-3 text-sm text-slate-300/80">{cluster.description}</p>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Coverage</span>
                    <span>{cluster.coverage}%</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Repo count</span>
                    <span>{cluster.repoCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Momentum</span>
                    <span>{cluster.momentum}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      </div>
    </AppChrome>
  );
}
