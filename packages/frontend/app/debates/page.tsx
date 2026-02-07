import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { DebateList } from "@/components/debate/DebateList";
import { LoginModal } from "@/components/auth/LoginModal";

export default function DebatesPage(): React.JSX.Element {
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
        <DebateList />
      </main>
      <LoginModal />
    </>
  );
}
