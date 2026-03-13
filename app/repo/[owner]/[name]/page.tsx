import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { AppChrome } from "@/components/layout/app-chrome";
import { SectionCard } from "@/components/layout/section-card";
import { getPortfolioRuntime } from "@/lib/server/portfolio/runtime";

type RepoPageProps = {
  params: Promise<{
    owner: string;
    name: string;
  }>;
};

export default async function RepoPage({ params }: RepoPageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const { owner, name } = await params;
  const detail = await getPortfolioRuntime().getRepoDetailModel(session.user.id, owner, name);

  if (!detail.hasImport) {
    return (
      <AppChrome
        eyebrow="Repo detail"
        title="Import your portfolio first"
        subtitle="Repo detail pages unlock after ghars has imported your own starred repositories."
        badge="Awaiting first import"
      >
        <SectionCard
          eyebrow="Onboarding"
          title="No imported portfolio yet"
          description="This route is now tied to the signed-in user's imported data, not the old demo catalog."
        >
          <Link
            href="/dashboard"
            className="inline-flex items-center rounded-full bg-gradient-to-r from-cyan-300 via-sky-400 to-indigo-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:translate-y-[-1px]"
          >
            Go to dashboard import
          </Link>
        </SectionCard>
      </AppChrome>
    );
  }

  if (!detail.repo || !detail.state) {
    notFound();
  }

  const repo = detail.repo;
  const state = detail.state;

  return (
    <AppChrome
      eyebrow="Repo detail"
      title={repo.fullName}
      subtitle={repo.description}
      badge={state.state}
    >
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard
          eyebrow="Current read"
          title="Why it is in the portfolio"
          description="A repo page should explain presence, not just mirror GitHub facts."
        >
          <div className="space-y-4">
            <p className="text-base text-slate-200/85">
              Imported into {detail.githubLogin ?? "this portfolio"} and currently tracked as `{state.state}`.
            </p>
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
                <p className="mt-2 text-2xl font-semibold text-white">{repo.language ?? "Unknown"}</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.025] p-4">
                <p className="text-[0.68rem] uppercase tracking-[0.2em] text-slate-400">Stars</p>
                <p className="mt-2 text-2xl font-semibold text-cyan-100">{repo.stargazerCount.toLocaleString()}</p>
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
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.025] p-4">
              <p className="text-[0.68rem] uppercase tracking-[0.2em] text-slate-400">Forks</p>
              <p className="mt-2 text-2xl font-semibold text-white">{repo.forksCount.toLocaleString()}</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.025] p-4">
              <p className="text-[0.68rem] uppercase tracking-[0.2em] text-slate-400">Open issues</p>
              <p className="mt-2 text-2xl font-semibold text-white">{repo.openIssuesCount.toLocaleString()}</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.025] p-4">
              <p className="text-[0.68rem] uppercase tracking-[0.2em] text-slate-400">Notes</p>
              <p className="mt-2 text-2xl font-semibold text-white">{detail.notes.length}</p>
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
            {detail.notes.length > 0 ? (
              detail.notes.map((note) => (
                <div key={note.id} className="rounded-[1.5rem] border border-white/8 bg-white/[0.025] p-4 text-sm text-slate-200/85">
                  <p>{note.content}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-500">
                    Updated {note.updatedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-white/12 bg-white/[0.02] p-4 text-sm text-slate-300/75">
                No personal notes yet. The repo detail route is live now, but note editing is still a follow-up slice.
              </div>
            )}
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
              <p className="mt-1">{state.starredAt.toLocaleString()}</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.025] px-4 py-3">
              <p className="text-[0.68rem] uppercase tracking-[0.2em] text-slate-400">Last pushed</p>
              <p className="mt-1">{repo.pushedAt ? repo.pushedAt.toLocaleString() : "Unknown"}</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.025] px-4 py-3">
              <p className="text-[0.68rem] uppercase tracking-[0.2em] text-slate-400">Latest release</p>
              <p className="mt-1">{repo.lastReleaseAt ? repo.lastReleaseAt.toLocaleString() : "Unknown"}</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.025] px-4 py-3">
              <p className="text-[0.68rem] uppercase tracking-[0.2em] text-slate-400">Last touched</p>
              <p className="mt-1">{state.lastTouchedAt ? state.lastTouchedAt.toLocaleString() : "Unknown"}</p>
            </div>
          </div>
        </SectionCard>
      </div>
    </AppChrome>
  );
}
