import Navbar from "@/components/Navbar";
import EventWorkspace from "@/components/EventWorkspace";

type EventDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { id } = await params;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f8fafc,#e0e7ff_45%,#f1f5f9_75%)] text-slate-900">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-6 pb-16 pt-10">
        <EventWorkspace eventId={id} />
      </main>
    </div>
  );
}
