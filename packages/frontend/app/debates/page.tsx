import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { DebateList } from "@/components/debate/DebateList";
import { DebateFilters } from "@/components/debate/DebateFilters";
import { LoginModal } from "@/components/auth/LoginModal";

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
    <>
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Debates</h1>
          <Link
            href="/debates/new"
            className="rounded-md bg-[var(--color-thesis)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            New Debate
          </Link>
        </div>
        <DebateFilters sort={sort} titleSearch={titleSearch} minArguments={minArguments} />
        <DebateList sort={sort} titleSearch={titleSearch} minArguments={minArguments} />
      </main>
      <LoginModal />
    </>
  );
}
