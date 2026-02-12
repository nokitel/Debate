import { Navbar } from "@/components/layout/Navbar";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { CreateDebateForm } from "@/components/debate/CreateDebateForm";
import { LoginModal } from "@/components/auth/LoginModal";
import { Footer } from "@/components/landing/Footer";

export default function NewDebatePage(): React.JSX.Element {
  return (
    <PublicLayout>
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold">Create New Debate</h1>
        <CreateDebateForm />
      </main>
      <Footer />
      <LoginModal />
    </PublicLayout>
  );
}
