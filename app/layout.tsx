import type { Metadata } from "next";
import Link from "next/link";
import { IBM_Plex_Sans, Syne, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { auth, signOut } from "@/auth";
import { AppProviders } from "@/components/providers/app-providers";
import { appEnv } from "@/lib/env/app-env";

const bodyFont = IBM_Plex_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const displayFont = Syne({
  variable: "--font-brand",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const monoFont = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "ghars",
  description: "Portfolio observability for your GitHub stars.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="en" className="dark">
      <body
        className={`${bodyFont.variable} ${displayFont.variable} ${monoFont.variable} min-h-screen bg-[radial-gradient(circle_at_top,#123660_0%,#091120_38%,#04070f_100%)] font-sans text-slate-100 antialiased`}
      >
        <header className="pointer-events-none fixed inset-x-0 top-0 z-50">
          <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-4 py-4 md:px-6">
            <div className="pointer-events-auto rounded-full border border-white/10 bg-slate-950/55 px-4 py-2 text-[0.7rem] uppercase tracking-[0.22em] text-slate-300 backdrop-blur">
              {session?.user
                ? `Signed in as ${session.user.name ?? session.user.email ?? "GitHub user"}`
                : appEnv.isGitHubAuthConfigured
                  ? "Sign in with GitHub to import real stars"
                  : "GitHub auth is not configured yet"}
            </div>

            <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/55 px-2 py-2 backdrop-blur">
              {session?.user ? (
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/" });
                  }}
                >
                  <button className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/10">
                    Sign out
                  </button>
                </form>
              ) : (
                <Link
                  href="/sign-in"
                  className="rounded-full bg-gradient-to-r from-cyan-300 via-sky-400 to-indigo-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:translate-y-[-1px]"
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        </header>

        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
