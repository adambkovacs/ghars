import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SearchStudio } from "@/components/search/search-studio";
import { AppChrome } from "@/components/layout/app-chrome";
import { SectionCard } from "@/components/layout/section-card";
import { getPortfolioRuntime } from "@/lib/server/portfolio/runtime";

export default async function SearchPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const search = await getPortfolioRuntime().getSearchModel(session.user.id);

  return (
    <AppChrome
      eyebrow="Search and triage"
      title="Recover the repo you almost remembered"
      subtitle={
        search.hasImport
          ? `Search across ${search.states.length} imported repos and pulled README context${search.githubLogin ? ` for ${search.githubLogin}` : ""}.`
          : "Import your portfolio first, then search becomes the fastest way back to what you starred."
      }
      badge={search.hasImport ? "Live recall" : "Awaiting first import"}
      viewerLabel={search.githubLogin ?? session.githubLogin ?? session.user.name ?? session.user.id}
    >
      {!search.hasImport ? (
        <SectionCard
          eyebrow="Onboarding"
          title="Search turns on after your first import"
          description="ghars keeps this surface empty until it has your actual GitHub portfolio to search across."
        >
          <div className="space-y-4 text-sm text-slate-300/82">
            <p>
              Sign-in is complete. The next step is importing your stars on the dashboard so search can run against your own repositories instead of fixtures.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center rounded-full bg-gradient-to-r from-cyan-300 via-sky-400 to-indigo-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:translate-y-[-1px]"
            >
              Go to dashboard import
            </Link>
          </div>
        </SectionCard>
      ) : (
        <SearchStudio
          repositories={search.repositories}
          userStates={search.states}
          notes={search.notes}
          savedViews={search.savedViews}
          quickQueries={search.quickQueries}
          githubLogin={search.githubLogin}
        />
      )}
    </AppChrome>
  );
}
