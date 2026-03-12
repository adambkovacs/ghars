import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { appEnv } from "@/lib/env/app-env";

export default async function SignInPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#123660_0%,#091120_38%,#04070f_100%)] px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-10 lg:grid lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-6">
          <p className="text-[0.75rem] font-semibold uppercase tracking-[0.28em] text-cyan-200/70">
            GitHub portfolio radar
          </p>
          <h1 className="font-display text-5xl leading-none tracking-tight text-white md:text-7xl">Connect GitHub, sync stars, build memory.</h1>
          <p className="max-w-2xl text-base text-slate-300/85 md:text-lg">
            ghars uses GitHub-only sign-in. Authenticate once, import your starred repos, and turn that pile of forgotten tabs into a living observability layer.
          </p>
        </section>

        <div className="glass-panel rounded-[2rem] border border-white/10 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] md:p-6">
          {appEnv.isGitHubAuthConfigured ? (
            <form
              action={async () => {
                "use server";
                await signIn("github", { redirectTo: "/dashboard" });
              }}
              className="space-y-4"
            >
              <p className="text-sm text-slate-300/80">
                GitHub is the only sign-in method in v1 because the product has no value without GitHub import.
              </p>
              <button className="w-full rounded-[1.4rem] bg-gradient-to-r from-cyan-300 via-sky-400 to-indigo-500 px-5 py-3 text-base font-semibold text-slate-950 transition hover:translate-y-[-1px]">
                Continue with GitHub
              </button>
            </form>
          ) : (
            <div className="space-y-3 rounded-[1.5rem] border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">
              <p className="font-semibold uppercase tracking-[0.2em] text-amber-200/80">Auth setup pending</p>
              <p>
                Add `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, and `AUTH_SECRET` to enable GitHub login.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
