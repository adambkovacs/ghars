"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Command, Search, Sparkle } from "lucide-react";
import { demoSavedViews, searchDemoRepos } from "@/lib/demo/data";
import { Sparkline } from "@/components/charts/sparkline";

export function SearchStudio() {
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchDemoRepos(query), [query]);

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="glass-panel rounded-[2rem] border border-white/10 p-5">
        <div className="flex items-center gap-3 rounded-[1.4rem] border border-white/10 bg-white/[0.03] px-4 py-3">
          <Command className="h-4 w-4 text-cyan-200" />
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-100/70">Saved views</p>
            <p className="text-sm text-slate-300">Fast pivots across the portfolio</p>
          </div>
        </div>

        <ul className="mt-4 space-y-3">
          {demoSavedViews.map((view) => (
            <li key={view.name} className="rounded-[1.4rem] border border-white/8 bg-white/[0.025] p-3">
              <p className="font-medium text-white">{view.name}</p>
              <p className="mt-1 text-sm text-slate-400">{view.query}</p>
              <p className="mt-2 text-xs uppercase tracking-[0.22em] text-amber-200/75">
                {view.count} repos
              </p>
            </li>
          ))}
        </ul>
      </aside>

      <div className="space-y-5">
        <div className="glass-panel rounded-[2rem] border border-white/10 p-5">
          <label className="flex items-center gap-3 rounded-[1.5rem] border border-white/10 bg-slate-950/60 px-4 py-4">
            <Search className="h-5 w-5 text-cyan-200" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search notes, topics, language, state, or repo name"
              className="w-full bg-transparent text-base text-white outline-none placeholder:text-slate-500"
            />
          </label>
          <div className="mt-4 flex flex-wrap gap-2">
            {["state:started", "playwright", "analytics", "vector-search", "watching"].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setQuery(chip)}
                className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-slate-300 transition hover:border-cyan-300/20 hover:text-white"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {results.map((repo) => (
            <Link
              key={repo.fullName}
              href={`/repo/${repo.owner}/${repo.name}`}
              className="glass-panel rounded-[2rem] border border-white/10 p-5 transition hover:border-cyan-300/30 hover:bg-white/[0.05]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[0.7rem] uppercase tracking-[0.26em] text-cyan-100/65">{repo.cluster}</p>
                  <h3 className="mt-1 text-xl font-semibold text-white">{repo.fullName}</h3>
                  <p className="mt-2 text-sm text-slate-300/80">{repo.summary}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-amber-100/80">
                  {repo.state}
                </span>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_180px] md:items-end">
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {repo.topics.map((topic) => (
                      <span
                        key={topic}
                        className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[0.7rem] uppercase tracking-[0.18em] text-slate-300"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>

                  <div className="rounded-[1.2rem] border border-white/8 bg-slate-950/45 px-3 py-3">
                    <p className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-slate-400">
                      <Sparkle className="h-3.5 w-3.5 text-cyan-200" />
                      Latest note
                    </p>
                    <p className="mt-2 text-sm text-slate-200/85">{repo.notes[0]}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-end justify-between text-xs uppercase tracking-[0.22em] text-slate-400">
                    <span>Momentum</span>
                    <span className="text-white">{repo.momentum}</span>
                  </div>
                  <div className="h-24">
                    <Sparkline points={repo.sparkline} />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
