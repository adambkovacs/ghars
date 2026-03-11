import { notFound } from "next/navigation";
import Link from "next/link";
import { AppChrome } from "@/components/layout/app-chrome";
import { SectionCard } from "@/components/layout/section-card";
import { Sparkline } from "@/components/charts/sparkline";
import { getRepo } from "@/lib/demo/data";

type RepoPageProps = {
  params: Promise<{
    owner: string;
    name: string;
  }>;
};

export default async function RepoPage({ params }: RepoPageProps) {
  const { owner, name } = await params;
  const repo = getRepo(owner, name);

  if (!repo) {
    notFound();
  }

  return (
    <AppChrome
      eyebrow={repo.cluster}
      title={repo.fullName}
      subtitle={repo.description}
      badge={repo.state}
    >
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard
          eyebrow="Current read"
          title="Why it is in the portfolio"
          description="A repo page should explain presence, not just mirror GitHub facts."
        >
          <div className="space-y-4">
            <p className="text-base text-slate-200/85">{repo.summary}</p>
            <div className="flex flex-wrap gap-2">
              {repo.topics.map((topic) => (
                <span
                  key={topic}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[0.7rem] uppercase tracking-[0.18em] text-slate-300"
                >
                  {topic}
                </span>
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.025] p-4">
                <p className="text-[0.68rem] uppercase tracking-[0.2em] text-slate-400">Language</p>
                <p className="mt-2 text-2xl font-semibold text-white">{repo.language}</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.025] p-4">
                <p className="text-[0.68rem] uppercase tracking-[0.2em] text-slate-400">Momentum</p>
                <p className="mt-2 text-2xl font-semibold text-cyan-100">{repo.momentum}</p>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Momentum"
          title="Signal trace"
          description="Daily motion plus the reasons you kept touching it."
          action={
            <Link
              href={repo.homepage ?? `https://github.com/${repo.fullName}`}
              className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/20 hover:bg-white/[0.07]"
            >
              Open upstream
            </Link>
          }
        >
          <div className="h-52">
            <Sparkline points={repo.sparkline} />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.025] p-4">
              <p className="text-[0.68rem] uppercase tracking-[0.2em] text-slate-400">Stars / 7d</p>
              <p className="mt-2 text-2xl font-semibold text-white">{repo.starDelta7d}</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.025] p-4">
              <p className="text-[0.68rem] uppercase tracking-[0.2em] text-slate-400">Forks / 30d</p>
              <p className="mt-2 text-2xl font-semibold text-white">{repo.forkDelta30d}</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.025] p-4">
              <p className="text-[0.68rem] uppercase tracking-[0.2em] text-slate-400">Touches / 14d</p>
              <p className="mt-2 text-2xl font-semibold text-white">{repo.userTouch14d}</p>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard
          eyebrow="Notes"
          title="Memory trail"
          description="Personal context is the difference between a star and a system."
        >
          <div className="space-y-3">
            {repo.notes.map((note) => (
              <div key={note} className="rounded-[1.5rem] border border-white/8 bg-white/[0.025] p-4 text-sm text-slate-200/85">
                {note}
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Metadata"
          title="Raw facts"
          description="Structured evidence beside the human layer."
        >
          <div className="grid gap-3 text-sm text-slate-200/85">
            <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.025] px-4 py-3">
              <p className="text-[0.68rem] uppercase tracking-[0.2em] text-slate-400">Starred</p>
              <p className="mt-1">{new Date(repo.starredAt).toLocaleString()}</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.025] px-4 py-3">
              <p className="text-[0.68rem] uppercase tracking-[0.2em] text-slate-400">Last pushed</p>
              <p className="mt-1">{new Date(repo.lastPushedAt).toLocaleString()}</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.025] px-4 py-3">
              <p className="text-[0.68rem] uppercase tracking-[0.2em] text-slate-400">Latest release</p>
              <p className="mt-1">{new Date(repo.lastRelease).toLocaleString()}</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.025] px-4 py-3">
              <p className="text-[0.68rem] uppercase tracking-[0.2em] text-slate-400">Open issues</p>
              <p className="mt-1">{repo.openIssues}</p>
            </div>
          </div>
        </SectionCard>
      </div>
    </AppChrome>
  );
}
