import { Navbar } from "@/components/layout/Navbar";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Footer } from "@/components/landing/Footer";
import { DebateView } from "@/components/debate/DebateView";
import { LoginModal } from "@/components/auth/LoginModal";

interface DebatePageProps {
  params: Promise<{ id: string }>;
}

export default async function DebatePage({ params }: DebatePageProps): Promise<React.JSX.Element> {
  const { id } = await params;

  return (
    <PublicLayout>
      <Navbar variant="warm" />
      <DebateView debateId={id} />
      <Footer />
      <LoginModal />
    </PublicLayout>
  );
}
