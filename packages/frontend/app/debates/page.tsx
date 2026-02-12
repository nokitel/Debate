import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { DebateList } from "@/components/debate/DebateList";
import { DebateFilters } from "@/components/debate/DebateFilters";
import { LoginModal } from "@/components/auth/LoginModal";
import { Footer } from "@/components/landing/Footer";

type SortOption = "newest" | "oldest" | "most-arguments";

const VALID_SORTS = new Set<SortOption>(["newest", "oldest", "most-arguments"]);

interface DebatesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DebatesPage({
  searchParams,
}: DebatesPageProps): Promise<React.JSX.Element> {
  const params = await searchParams;
  const rawSort = typeof params["sort"] === "string" ? params["sort"] : "newest";
  const sort: SortOption = VALID_SORTS.has(rawSort as SortOption)
    ? (rawSort as SortOption)
    : "newest";
  const titleSearch = typeof params["search"] === "string" ? params["search"] : "";
  const minArguments =
    typeof params["minArgs"] === "string" ? parseInt(params["minArgs"], 10) || 0 : 0;

  return (
    <PublicLayout>
      <Navbar variant="warm" />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-serif-display text-2xl font-semibold text-[var(--pub-text)]">
            Public Debates
          </h1>
          <Link
            href="/debates/new"
            className="rounded-lg bg-[var(--pub-accent)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--pub-accent-hover)]"
          >
            + New Debate
          </Link>
        </div>
        <DebateFilters sort={sort} titleSearch={titleSearch} minArguments={minArguments} />
        <DebateList sort={sort} titleSearch={titleSearch} minArguments={minArguments} />
      </main>
      <Footer />
      <LoginModal />
    </PublicLayout>
  );
}
