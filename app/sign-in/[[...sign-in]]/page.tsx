import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#123660_0%,#091120_38%,#04070f_100%)] px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-10 lg:grid lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-6">
          <p className="text-[0.75rem] font-semibold uppercase tracking-[0.28em] text-cyan-200/70">
            GitHub portfolio radar
          </p>
          <h1 className="font-display text-5xl leading-none tracking-tight text-white md:text-7xl">
            Sign in, sync stars, build memory.
          </h1>
          <p className="max-w-2xl text-base text-slate-300/85 md:text-lg">
            ghars turns starred repos into a living observability layer with notes, momentum, drift,
            and scheduled refresh for the repos you actually start using.
          </p>
        </section>

        <div className="glass-panel rounded-[2rem] border border-white/10 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] md:p-6">
          <SignIn
            routing="path"
            path="/sign-in"
            fallbackRedirectUrl="/dashboard"
            signUpUrl="/sign-up"
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none bg-transparent",
              },
            }}
          />
        </div>
      </div>
    </main>
  );
}
