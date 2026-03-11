import { AppChrome } from "@/components/layout/app-chrome";
import { SearchStudio } from "@/components/search/search-studio";

export default function SearchPage() {
  return (
    <AppChrome
      eyebrow="Search and triage"
      title="Recover the repo you almost remembered"
      subtitle="The search layer is where notes, topics, states, and memory should collapse into one command surface."
      badge="Demo recall"
    >
      <SearchStudio />
    </AppChrome>
  );
}
