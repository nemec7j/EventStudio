"use client";

import { useEffect, useMemo, useState } from "react";
import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useLanguage } from "@/components/LanguageProvider";
import { t } from "@/lib/i18n";
import ConfirmDialog from "@/components/ConfirmDialog";
import Toast from "@/components/Toast";
import { useToast } from "@/lib/useToast";

type TemplateItem = {
  id: string;
  name: string;
  type: "MD" | "HTML";
  detectedPlaceholders: string[];
  originalFileUrl: string;
  generatedMaterials: Array<{
    id: string;
    eventId: string;
    outputFileUrl: string;
    createdAt: string;
  }>;
};

type EventItem = {
  id: string;
  title?: string | null;
};

type TemplateManagerProps = {
  eventId?: string;
  eventTitle?: string | null;
};

export default function TemplateManager({
  eventId,
  eventTitle,
}: TemplateManagerProps) {
  const { dictionary } = useLanguage();
  const toast = useToast();
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Record<string, string>>(
    {}
  );
  const [selectedLanguage, setSelectedLanguage] = useState<Record<string, string>>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [confirmingTemplate, setConfirmingTemplate] = useState<TemplateItem | null>(
    null
  );

  const isEventLocked = Boolean(eventId);
  const latestEventId = useMemo(
    () => eventId ?? events[0]?.id ?? "",
    [eventId, events]
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const [templatesRes, eventsRes] = await Promise.all([
        fetch("/api/templates"),
        fetch("/api/events"),
      ]);
      const templatesPayload = await templatesRes.json();
      const eventsPayload = await eventsRes.json();
      if (templatesRes.ok) {
        setTemplates(templatesPayload.templates ?? []);
      }
      if (eventsRes.ok) {
        setEvents(eventsPayload.events ?? []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpload = async (file: File) => {
    setWorking(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/templates/upload", {
        method: "POST",
        body: formData,
      });
      await response.json();
      await loadData();
    } finally {
      setWorking(false);
    }
  };

  const handleGenerate = async (templateId: string) => {
    const resolvedEventId = eventId || selectedEvent[templateId] || latestEventId;
    if (!resolvedEventId) {
      return;
    }
    const language = selectedLanguage[templateId] || "cs";
    setWorking(true);
    try {
      const response = await fetch("/api/templates/fill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, eventId: resolvedEventId, language }),
      });
      await response.json();
      await loadData();
    } finally {
      setWorking(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    setWorking(true);
    try {
      await fetch(`/api/templates/${templateId}`, { method: "DELETE" });
      await loadData();
      toast.show(t(dictionary, "toast_deleted"));
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="grid gap-6">
      <FileUpload onUpload={handleUpload} disabled={working} />

      <div className="grid gap-4 md:grid-cols-2">
        {loading ? (
            <Card>
              <CardContent className="p-6 text-sm text-slate-500">
                {t(dictionary, "templates_loading")}
              </CardContent>
            </Card>
          ) : templates.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-sm text-slate-500">
                {t(dictionary, "templates_empty")}
              </CardContent>
            </Card>
          ) : (
          templates.map((template) => {
            const materials = eventId
              ? template.generatedMaterials?.filter(
                  (material) => material.eventId === eventId
                )
              : template.generatedMaterials;
            const recentMaterials = (materials ?? []).slice(0, 3);
            const canGenerate = Boolean(eventId || events.length > 0);
            const selectValue =
              eventId || selectedEvent[template.id] || latestEventId;
            const languageValue = selectedLanguage[template.id] || "cs";

            return (
              <Card key={template.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                        {template.type}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-slate-900">
                        {template.name}
                      </h3>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-red-700 hover:bg-red-50 hover:text-red-800"
                      disabled={working}
                      onClick={() => setConfirmingTemplate(template)}
                    >
                      {t(dictionary, "templates_delete")}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="mt-auto flex flex-col gap-3">
                  {isEventLocked ? (
                    <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
                      {t(dictionary, "templates_event_label", {
                        name: eventTitle ?? eventId ?? "",
                      })}
                    </div>
                  ) : (
                    <select
                      className="h-10 rounded-full border border-slate-200 bg-white px-4 text-sm"
                      value={selectValue}
                      onChange={(event) =>
                        setSelectedEvent((prev) => ({
                          ...prev,
                          [template.id]: event.target.value,
                        }))
                      }
                    >
                      <option value="">
                        {t(dictionary, "templates_select_event")}
                      </option>
                      {events.map((event) => (
                        <option key={event.id} value={event.id}>
                          {event.title ?? event.id}
                        </option>
                      ))}
                    </select>
                  )}
                  <select
                    className="h-10 rounded-full border border-slate-200 bg-white px-4 text-sm"
                    value={languageValue}
                    onChange={(event) =>
                      setSelectedLanguage((prev) => ({
                        ...prev,
                        [template.id]: event.target.value,
                      }))
                    }
                  >
                    <option value="cs">Čeština</option>
                    <option value="en">English</option>
                    <option value="de">Deutsch</option>
                    <option value="pl">Polski</option>
                  </select>
                  <Button
                    variant="default"
                    onClick={() => handleGenerate(template.id)}
                    disabled={working || !canGenerate}
                  >
                    {t(dictionary, "templates_generate")}
                  </Button>
                  {recentMaterials.length > 0 && (
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-500">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                        {t(dictionary, "templates_outputs")}
                      </p>
                      <ul className="mt-2 space-y-2">
                        {recentMaterials.map((output) => (
                          <li
                            key={output.id}
                            className="flex items-center justify-between gap-2"
                          >
                            <span>
                              {new Date(output.createdAt).toLocaleString("cs-CZ")}
                            </span>
                            <a
                              href={output.outputFileUrl}
                              className="text-slate-700 underline"
                            >
                              {t(dictionary, "templates_download")}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
      <ConfirmDialog
        open={Boolean(confirmingTemplate)}
        title={t(dictionary, "confirm_title")}
        description={
          confirmingTemplate
            ? t(dictionary, "templates_delete_confirm", {
                name: confirmingTemplate.name,
              })
            : ""
        }
        confirmLabel={t(dictionary, "confirm_delete")}
        cancelLabel={t(dictionary, "confirm_cancel")}
        destructive
        loading={working}
        onCancel={() => setConfirmingTemplate(null)}
        onConfirm={() => {
          if (confirmingTemplate) {
            void handleDelete(confirmingTemplate.id);
            setConfirmingTemplate(null);
          }
        }}
      />
      <Toast open={toast.open} message={toast.message} onClose={toast.hide} />
    </div>
  );
}
