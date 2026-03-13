import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppChrome } from "@/components/layout/app-chrome";
import { SectionCard } from "@/components/layout/section-card";
import { getPortfolioRuntime } from "@/lib/server/portfolio/runtime";

export default async function ReportsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const reports = await getPortfolioRuntime().getReportsModel(session.user.id);

  return (
    <AppChrome
      eyebrow="Reports"
      title="Live generated portfolio reviews"
      subtitle={
        reports.hasImport
          ? `Generated from your imported portfolio${reports.githubLogin ? ` for ${reports.githubLogin}` : ""}. Stored report persistence can come later.`
          : "Import your stars first so reports can summarize your actual portfolio instead of demo fixtures."
      }
      badge={
        reports.hasImport
          ? reports.lastSyncedAt
            ? `Based on sync ${reports.lastSyncedAt.toLocaleDateString("en-US")}`
            : "Live portfolio review"
          : "Awaiting first import"
      }
    >
      {!reports.hasImport ? (
        <SectionCard
          eyebrow="Onboarding"
          title="Reports unlock after import"
          description="This page now waits for your imported portfolio before it renders any review summaries."
        >
          <Link
            href="/dashboard"
            className="inline-flex items-center rounded-full bg-gradient-to-r from-cyan-300 via-sky-400 to-indigo-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:translate-y-[-1px]"
          >
            Go to dashboard import
          </Link>
        </SectionCard>
      ) : (
        <div className="grid gap-6">
          {reports.reports.map((report) => (
            <SectionCard
              key={report.id}
              eyebrow={report.period}
              title={report.title}
              description={report.generatedAt.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            >
              <p className="max-w-3xl text-base text-slate-300/85">{report.summary}</p>
              <div className="mt-5 grid gap-3 lg:grid-cols-2">
                {report.sections.map((section) => (
                  <article key={section.id} className="rounded-[1.5rem] border border-white/8 bg-white/[0.025] p-4">
                    <p className="text-[0.7rem] uppercase tracking-[0.2em] text-cyan-100/70">{section.title}</p>
                    <p className="mt-3 text-sm text-slate-200/85">{section.summary}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {section.evidenceRepoNames.length > 0 ? (
                        section.evidenceRepoNames.map((repoName) => (
                          <span
                            key={repoName}
                            className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-slate-300"
                          >
                            {repoName}
                          </span>
                        ))
                      ) : (
                        <span className="rounded-full border border-dashed border-white/12 bg-white/[0.02] px-2.5 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-slate-400">
                          No evidence repos yet
                        </span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </SectionCard>
          ))}
        </div>
      )}
    </AppChrome>
  );
}
