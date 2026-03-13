"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[radial-gradient(circle_at_top,#123660_0%,#091120_38%,#04070f_100%)] px-6 py-10 text-white">
        <main className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl flex-col justify-center gap-6">
          <div className="rounded-[2rem] border border-rose-300/20 bg-rose-300/10 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
            <p className="text-[0.75rem] font-semibold uppercase tracking-[0.28em] text-rose-200/80">
              Runtime failure
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">
              ghars hit a server-side error.
            </h1>
            <p className="mt-4 text-base leading-7 text-rose-100/85">
              The route failed while loading live portfolio data. Retry once. If it keeps failing,
              use the dashboard import panel or sign out and reconnect GitHub.
            </p>
            {error.digest ? (
              <p className="mt-4 text-sm text-rose-100/75">Digest: {error.digest}</p>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => reset()}
                className="rounded-full bg-gradient-to-r from-cyan-300 via-sky-400 to-indigo-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:translate-y-[-1px]"
              >
                Retry
              </button>
              <Link
                href="/dashboard"
                className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.08]"
              >
                Go to dashboard
              </Link>
              <Link
                href="/sign-in"
                className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.08]"
              >
                Reconnect GitHub
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
