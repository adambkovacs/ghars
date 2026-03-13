"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Activity, Compass, Command, FileClock, Orbit, Sparkles } from "lucide-react";
import { clsx } from "clsx";

const navItems = [
  { href: "/", label: "Overview", icon: Compass },
  { href: "/dashboard", label: "Dashboard", icon: Activity },
  { href: "/search", label: "Search", icon: Command },
  { href: "/analytics", label: "Analytics", icon: Orbit },
  { href: "/reports", label: "Reports", icon: FileClock },
];

type AppChromeProps = {
  title: string;
  subtitle: string;
  eyebrow?: string;
  badge?: string;
  viewerLabel?: string | null;
  children: ReactNode;
};

export function AppChrome({ title, subtitle, eyebrow, badge, viewerLabel, children }: AppChromeProps) {
  const pathname = usePathname();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(251,146,60,0.16),_transparent_22%),linear-gradient(160deg,#07111f_0%,#081120_45%,#0b1730_100%)] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:64px_64px] opacity-[0.18]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.2),_transparent_55%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-[1600px] gap-6 px-4 py-5 md:px-6">
        <aside className="hidden w-[250px] shrink-0 flex-col justify-between rounded-[2.2rem] border border-white/10 bg-white/[0.03] p-4 backdrop-blur xl:flex">
          <div className="space-y-8">
            <div className="rounded-[1.7rem] border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 via-sky-400 to-indigo-500 text-slate-950 shadow-[0_14px_38px_rgba(34,211,238,0.35)]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-display text-lg tracking-tight text-white">ghars</p>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                    GitHub portfolio radar
                  </p>
                </div>
              </div>
            </div>

            <nav className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={clsx(
                      "flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition",
                      active
                        ? "border-cyan-300/40 bg-cyan-300/10 text-white shadow-[0_16px_40px_rgba(8,145,178,0.24)]"
                        : "border-white/5 bg-white/[0.025] text-slate-300 hover:border-white/10 hover:bg-white/[0.05]"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="rounded-[1.7rem] border border-amber-300/20 bg-amber-300/8 p-4 text-sm text-amber-100/90">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-amber-200/75">
              Watchlist signal
            </p>
            <p className="mt-2 font-medium">3 repos are moving faster than your last manual review cycle.</p>
            <p className="mt-2 text-xs text-amber-100/70">
              Start with `apify/crawlee`, `vercel/ai`, and `get-convex/convex-backend`.
            </p>
          </div>
        </aside>

        <main className="flex-1 space-y-6">
          <header className="glass-panel rounded-[2.2rem] border border-white/10 px-5 py-5 md:px-7 md:py-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-3xl space-y-2">
                {eyebrow ? (
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.26em] text-cyan-200/70">
                    {eyebrow}
                  </p>
                ) : null}
                <h1 className="font-display text-4xl tracking-tight text-white md:text-5xl">{title}</h1>
                <p className="max-w-2xl text-sm text-slate-300/85 md:text-base">{subtitle}</p>
              </div>

              <div className="flex flex-wrap gap-3">
                {badge ? (
                  <span className="inline-flex items-center rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">
                    {badge}
                  </span>
                ) : null}
                {viewerLabel ? (
                  <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200">
                    Portfolio: {viewerLabel}
                  </span>
                ) : null}
                <Link
                  href="/search"
                  className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/10"
                >
                  Open command search
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center rounded-full bg-gradient-to-r from-amber-300 via-orange-400 to-rose-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-[0_16px_36px_rgba(249,115,22,0.32)] transition hover:translate-y-[-1px]"
                >
                  Open portfolio pulse
                </Link>
              </div>
            </div>
          </header>

          {children}
        </main>
      </div>
    </div>
  );
}
