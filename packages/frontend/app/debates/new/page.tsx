import { Header } from "@/components/layout/Header";
import { CreateDebateForm } from "@/components/debate/CreateDebateForm";
import { LoginModal } from "@/components/auth/LoginModal";

export default function NewDebatePage(): React.JSX.Element {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold">Create New Debate</h1>
        <CreateDebateForm />
      </main>
      <LoginModal />
    </>
  );
}
