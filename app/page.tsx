import Navbar from "@/components/Navbar";
import Dashboard from "@/components/Dashboard";

export default function Home() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f8fafc,#e0e7ff_45%,#f1f5f9_75%)] text-slate-900">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-6 pb-16 pt-10">
        <Dashboard />
      </main>
    </div>
  );
}
