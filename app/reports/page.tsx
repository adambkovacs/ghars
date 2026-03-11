import { AppChrome } from "@/components/layout/app-chrome";
import { SectionCard } from "@/components/layout/section-card";
import { demoReports } from "@/lib/demo/data";

export default function ReportsPage() {
  return (
    <AppChrome
      eyebrow="Reports"
      title="Stored snapshots for weekly and monthly review"
      subtitle="Reports are where the dashboard stops being ambient and starts becoming memory."
      badge="2 stored snapshots"
    >
      <div className="grid gap-6">
        {demoReports.map((report) => (
          <SectionCard
            key={report.slug}
            eyebrow={report.cadence}
            title={report.title}
            description={new Date(report.generatedAt).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          >
            <p className="max-w-3xl text-base text-slate-300/85">{report.summary}</p>
            <ul className="mt-5 grid gap-3 md:grid-cols-3">
              {report.bullets.map((bullet) => (
                <li
                  key={bullet}
                  className="rounded-[1.5rem] border border-white/8 bg-white/[0.025] p-4 text-sm text-slate-200/85"
                >
                  {bullet}
                </li>
              ))}
            </ul>
          </SectionCard>
        ))}
      </div>
    </AppChrome>
  );
}
