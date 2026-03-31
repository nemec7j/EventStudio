"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/components/LanguageProvider";
import { t } from "@/lib/i18n";
import ConfirmDialog from "@/components/ConfirmDialog";
import Toast from "@/components/Toast";
import { useToast } from "@/lib/useToast";

type EventItem = {
  id: string;
  title?: string | null;
  status?: string | null;
  startDateTime?: string | null;
  locationName?: string | null;
  city?: string | null;
  updatedAt?: string | null;
};

export default function Dashboard() {
  const router = useRouter();
  const { dictionary } = useLanguage();
  const toast = useToast();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmingEvent, setConfirmingEvent] = useState<EventItem | null>(null);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/events");
      const payload = await response.json();
      if (response.ok) {
        setEvents(payload.events ?? []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DRAFT" }),
      });
      const payload = await response.json();
      if (response.ok && payload.event?.id) {
        router.push(`/events/${payload.event.id}`);
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (event: EventItem) => {
    setDeletingId(event.id);
    try {
      const response = await fetch(`/api/events/${event.id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setEvents((prev) => prev.filter((item) => item.id !== event.id));
        toast.show(t(dictionary, "toast_deleted"));
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
            {t(dictionary, "nav_dashboard")}
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-900">
            {t(dictionary, "dashboard_title")}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {t(dictionary, "dashboard_subtitle")}
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Button onClick={handleCreate} disabled={creating}>
            {t(dictionary, "dashboard_new")}
          </Button>
          <Button variant="outline" onClick={fetchEvents} disabled={loading}>
            {t(dictionary, "dashboard_refresh")}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {loading ? (
            <Card>
              <CardContent className="p-6 text-sm text-slate-500">
                {t(dictionary, "dashboard_loading")}
              </CardContent>
            </Card>
          ) : events.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-sm text-slate-500">
                {t(dictionary, "dashboard_empty")}
              </CardContent>
            </Card>
          ) : (
          events.map((event) => (
            <Card key={event.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {event.title ?? "Bez nazvu"}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {event.locationName ||
                        event.city ||
                        t(dictionary, "dashboard_city_missing")}
                    </p>
                  </div>
                  <Badge
                    variant={event.status === "PUBLISHED" ? "success" : "subtle"}
                  >
                    {event.status ?? t(dictionary, "draft_status_draft")}
                  </Badge>
                </div>
                <p className="mt-4 text-xs uppercase tracking-[0.2em] text-slate-400">
                  {t(dictionary, "dashboard_updated")}{" "}
                  {event.updatedAt
                    ? new Date(event.updatedAt).toLocaleString("cs-CZ")
                    : "-"}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/events/${event.id}`)}
                  >
                    {t(dictionary, "dashboard_open")}
                  </Button>
                  <Button
                    variant="outline"
                    className="text-red-700 hover:bg-red-50 hover:text-red-800"
                    disabled={deletingId === event.id}
                    onClick={() => setConfirmingEvent(event)}
                  >
                    {deletingId === event.id
                      ? t(dictionary, "event_delete_working")
                      : t(dictionary, "dashboard_delete")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      <ConfirmDialog
        open={Boolean(confirmingEvent)}
        title={t(dictionary, "confirm_title")}
        description={
          confirmingEvent
            ? t(dictionary, "dashboard_delete_confirm", {
                title: confirmingEvent.title?.trim() || "-",
              })
            : ""
        }
        confirmLabel={t(dictionary, "confirm_delete")}
        cancelLabel={t(dictionary, "confirm_cancel")}
        destructive
        loading={Boolean(confirmingEvent && deletingId === confirmingEvent.id)}
        onCancel={() => setConfirmingEvent(null)}
        onConfirm={() => {
          if (confirmingEvent) {
            void handleDelete(confirmingEvent);
            setConfirmingEvent(null);
          }
        }}
      />
      <Toast open={toast.open} message={toast.message} onClose={toast.hide} />
    </div>
  );
}
