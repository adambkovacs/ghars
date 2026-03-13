"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Command, Search, Sparkle } from "lucide-react";
import { changeRepoStateAction } from "@/app/repo/[owner]/[name]/actions";
import { RepoStateForm } from "@/components/repo/repo-state-form";
import type { RepoCatalog, SearchFilters, UserNote, UserRepoState } from "@/lib/domain/types";
import type { PortfolioSearchChip, PortfolioSearchSavedView } from "@/lib/server/portfolio/runtime";
import { searchPortfolio } from "@/lib/services/searchPortfolio";

type SearchStudioProps = {
  repositories: RepoCatalog[];
  userStates: UserRepoState[];
  notes: UserNote[];
  savedViews: PortfolioSearchSavedView[];
  quickQueries: PortfolioSearchChip[];
  githubLogin?: string | null;
};

export function SearchStudio({
  repositories,
  userStates,
  notes,
  savedViews,
  quickQueries,
  githubLogin,
}: SearchStudioProps) {
  const [query, setQuery] = useState("");
  const [activeViewId, setActiveViewId] = useState("all");
  const [filters, setFilters] = useState<SearchFilters | undefined>(undefined);

  const results = useMemo(
    () =>
      searchPortfolio({
        query,
        repositories,
        userStates,
        notes,
        filters,
      }),
    [filters, notes, query, repositories, userStates]
  );

  const activeView = savedViews.find((view) => view.id === activeViewId) ?? null;

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
          {savedViews.map((view) => {
            const active = activeViewId === view.id;

            return (
              <li key={view.id}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveViewId(view.id);
                    setQuery(view.query);
                    setFilters(view.filters);
                  }}
                  className={`w-full rounded-[1.4rem] border p-3 text-left transition ${
                    active
                      ? "border-cyan-300/30 bg-cyan-300/10"
                      : "border-white/8 bg-white/[0.025] hover:border-white/12 hover:bg-white/[0.04]"
                  }`}
                >
                  <p className="font-medium text-white">{view.name}</p>
                  <p className="mt-1 text-sm text-slate-400">{view.description}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.22em] text-amber-200/75">
                    {view.count} repos
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <div className="space-y-5">
        <div className="glass-panel rounded-[2rem] border border-white/10 p-5">
          <label className="flex items-center gap-3 rounded-[1.5rem] border border-white/10 bg-slate-950/60 px-4 py-4">
            <Search className="h-5 w-5 text-cyan-200" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search notes, README context, topics, language, state, or repo name"
              className="w-full bg-transparent text-base text-white outline-none placeholder:text-slate-500"
            />
          </label>
          <div className="mt-4 flex flex-wrap gap-2">
            {quickQueries.map((chip) => (
              <button
                key={`${chip.label}:${chip.query}`}
                type="button"
                onClick={() => {
                  setActiveViewId("all");
                  setFilters(undefined);
                  setQuery(chip.query);
                }}
                className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-slate-300 transition hover:border-cyan-300/20 hover:text-white"
              >
                {chip.label}
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-300/80">
            <p>
              {results.length} result{results.length === 1 ? "" : "s"}
              {githubLogin ? ` for ${githubLogin}` : ""}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {activeView ? (
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs uppercase tracking-[0.18em] text-cyan-100">
                  {activeView.name}
                </span>
              ) : null}
              {(query.length > 0 || filters) && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveViewId("all");
                    setQuery("");
                    setFilters(undefined);
                  }}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-300 transition hover:border-white/20 hover:text-white"
                >
                  Clear search
                </button>
              )}
            </div>
          </div>
        </div>

        {results.length === 0 ? (
          <div className="glass-panel rounded-[2rem] border border-white/10 p-6 text-sm text-slate-300/82">
            No repos match the current query. Try a repo name, topic, language, state, or something from your notes.
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {results.map((result) => {
              const latestNote =
                result.notes[0]?.content ??
                result.repo.readmeSummary ??
                "No personal notes yet. README enrichment will give this card more substance once it lands.";

              return (
                <article
                  key={result.repo.fullName}
                  className="glass-panel rounded-[2rem] border border-white/10 p-5 transition hover:border-cyan-300/30 hover:bg-white/[0.05]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[0.7rem] uppercase tracking-[0.26em] text-cyan-100/65">
                        {result.reasons.join(" · ")}
                      </p>
                      <Link
                        href={`/repo/${result.repo.owner}/${result.repo.name}`}
                        className="mt-1 inline-block text-xl font-semibold text-white hover:text-cyan-100"
                      >
                        {result.repo.fullName}
                      </Link>
                      <p className="mt-2 text-sm text-slate-300/80">{result.repo.description}</p>
                    </div>
                    <RepoStateForm
                      repoFullName={result.repo.fullName}
                      currentState={result.state.state}
                      compact
                      action={changeRepoStateAction}
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {result.repo.topics.map((topic) => (
                      <span
                        key={topic}
                        className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[0.7rem] uppercase tracking-[0.18em] text-slate-300"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-[1fr_220px]">
                    <div className="rounded-[1.2rem] border border-white/8 bg-slate-950/45 px-3 py-3">
                      <p className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-slate-400">
                        <Sparkle className="h-3.5 w-3.5 text-cyan-200" />
                        {result.notes.length > 0 ? "Latest note" : result.repo.readmeSummary ? "README signal" : "Context"}
                      </p>
                      <p className="mt-2 text-sm text-slate-200/85">{latestNote}</p>
                    </div>

                    <div className="rounded-[1.2rem] border border-white/8 bg-white/[0.025] px-3 py-3 text-sm text-slate-300/82">
                      <p>{result.repo.language ?? "Unknown language"}</p>
                      <p className="mt-1">{result.repo.stargazerCount.toLocaleString()} stars</p>
                      <p className="mt-1">{result.notes.length} notes</p>
                      <p className="mt-1">
                        Starred {result.state.starredAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
