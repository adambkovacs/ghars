import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Lock, Radar, Search, Sparkles } from "lucide-react";
import { auth } from "@/auth";

const featureCards = [
  {
    icon: Lock,
    title: "Private by default",
    description: "No portfolio surfaces are exposed before sign-in. Public traffic gets a landing page, not your repo universe.",
  },
  {
    icon: Search,
    title: "Recover what you starred",
    description: "Find the repo you saw three days ago by name, topic, note, or the reason you cared in the first place.",
  },
  {
    icon: Radar,
    title: "Track movement, not just counts",
    description: "See heat, drift, neglect, and momentum across the repos you actually revisit and start using.",
  },
];

export default async function HomePage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#123660_0%,#091120_38%,#04070f_100%)] px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl flex-col justify-center gap-14">
        <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100">
              <Sparkles className="h-4 w-4" />
              Private GitHub portfolio radar
            </div>

            <div className="space-y-5">
              <h1 className="font-display text-5xl leading-none tracking-tight text-white md:text-7xl">
                Your GitHub stars deserve a private observability layer.
              </h1>
              <p className="max-w-2xl text-base text-slate-300/85 md:text-lg">
                ghars is for the repo graveyard problem. Sign in with GitHub, import your stars, and turn a pile of forgotten saves into a dashboard you can actually use.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-300 via-sky-400 to-indigo-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:translate-y-[-1px]"
              >
                Continue with GitHub
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.08]"
              >
                Open login
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.26em] text-amber-200/80">
              Why this page is public
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-white">You should not leak portfolio context before login.</h2>
            <p className="mt-4 text-sm leading-6 text-slate-300/85">
              The signed-out experience is now a clean front door. Dashboard views, repo detail pages, analytics, reporting, and search stay behind auth.
            </p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {featureCards.map((card) => {
            const Icon = card.icon;

            return (
              <article
                key={card.title}
                className="rounded-[1.8rem] border border-white/10 bg-white/[0.035] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.05] text-cyan-100">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="mt-5 text-xl font-semibold text-white">{card.title}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-300/82">{card.description}</p>
              </article>
            );
          })}
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.26em] text-slate-400">Current product model</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">Dashboard first, memory second, search everywhere.</h2>
              <p className="mt-4 text-sm leading-6 text-slate-300/82">
                After sign-in, ghars imports your GitHub stars and turns them into a private control room for recall, trend tracking, and portfolio analysis.
              </p>
            </div>

            <div className="rounded-[1.6rem] border border-emerald-300/20 bg-emerald-300/10 px-5 py-4 text-sm text-emerald-100">
              GitHub-only login in v1. No email flow, no public portfolio pages.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
