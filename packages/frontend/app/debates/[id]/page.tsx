import { Header } from "@/components/layout/Header";
import { DebateView } from "@/components/debate/DebateView";
import { LoginModal } from "@/components/auth/LoginModal";

interface DebatePageProps {
  params: Promise<{ id: string }>;
}

export default async function DebatePage({ params }: DebatePageProps): Promise<React.JSX.Element> {
  const { id } = await params;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <DebateView debateId={id} />
      </main>
      <LoginModal />
    </>
  );
}
