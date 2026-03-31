"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import ChatWindow from "@/components/ChatWindow";
import EventDraftPanel from "@/components/EventDraftPanel";
import TemplateManager from "@/components/TemplateManager";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/components/LanguageProvider";
import { t } from "@/lib/i18n";
import ConfirmDialog from "@/components/ConfirmDialog";
import Toast from "@/components/Toast";
import { useToast } from "@/lib/useToast";

type EventWorkspaceProps = {
  eventId: string;
};

type ApiEventResponse =
  | { event: Record<string, unknown> }
  | { error?: string };

export default function EventWorkspace({ eventId }: EventWorkspaceProps) {
  const router = useRouter();
  const { dictionary } = useLanguage();
  const toast = useToast();
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translateLanguage, setTranslateLanguage] = useState("en");
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmImageDelete, setConfirmImageDelete] = useState(false);

  const imageUrl = Array.isArray(draft?.assets)
    ? (draft?.assets.find(
        (asset) =>
          asset &&
          typeof asset === "object" &&
          "url" in asset &&
          (asset as { url?: string }).url
      ) as { url?: string } | undefined)?.url
    : undefined;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/events/${eventId}`, {
          cache: "no-store",
        });

        const text = await response.text();
        let payload: ApiEventResponse | null = null;

        if (text && text.trim().length > 0) {
          try {
            payload = JSON.parse(text) as ApiEventResponse;
          } catch {
            payload = null;
          }
        }

        if (cancelled) return;

        if (response.ok) {
          const event = payload && "event" in payload ? payload.event : null;
          if (event) {
            setDraft(event);
          } else {
            setError(t(dictionary, "event_error_empty"));
          }
        } else {
          const apiError =
            payload && "error" in payload ? payload.error : undefined;

          setError(
            apiError ??
              t(dictionary, "event_error_load_status", {
                status: response.status,
              })
          );
        }
      } catch {
        if (cancelled) return;
        setError(t(dictionary, "event_error_load"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [dictionary, eventId]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.push("/");
        router.refresh();
        toast.show(t(dictionary, "toast_deleted"));
        return;
      }

      setError(t(dictionary, "event_delete_failed"));
    } catch {
      setError(t(dictionary, "event_delete_failed"));
    } finally {
      setDeleting(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    setUploadingImage(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`/api/events/${eventId}/image`, {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? "Upload error");
      }
      if (payload?.event) {
        setDraft(payload.event);
        toast.show(t(dictionary, "toast_deleted"));
      }
    } catch {
      setError(t(dictionary, "image_upload_failed"));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageDelete = async () => {
    if (!imageUrl) {
      return;
    }
    setUploadingImage(true);
    setError(null);
    try {
      const response = await fetch(`/api/events/${eventId}/image`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: imageUrl }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? "Delete error");
      }
      if (payload?.event) {
        setDraft(payload.event);
        toast.show(t(dictionary, "toast_deleted"));
      }
    } catch {
      setError(t(dictionary, "image_delete_failed"));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleTranslate = async () => {
    if (!translateLanguage || translateLanguage === "cs") {
      return;
    }
    setTranslating(true);
    setError(null);
    try {
      const response = await fetch(`/api/events/${eventId}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: translateLanguage }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? "Translate error");
      }
      if (payload?.event) {
        setDraft(payload.event);
      }
    } catch {
      setError(t(dictionary, "translate_failed"));
    } finally {
      setTranslating(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-slate-500">
          {t(dictionary, "event_loading")}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-slate-500">{error}</CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="flex justify-end">
        <Button
          variant="outline"
          className="text-red-700 hover:bg-red-50 hover:text-red-800"
          disabled={deleting}
          onClick={() => setConfirmDelete(true)}
        >
          {deleting
            ? t(dictionary, "event_delete_working")
            : t(dictionary, "event_delete_label")}
        </Button>
      </div>
      <ConfirmDialog
        open={confirmDelete}
        title={t(dictionary, "confirm_title")}
        description={t(dictionary, "event_delete_confirm")}
        confirmLabel={t(dictionary, "confirm_delete")}
        cancelLabel={t(dictionary, "confirm_cancel")}
        destructive
        loading={deleting}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          void handleDelete();
          setConfirmDelete(false);
        }}
      />
      <ConfirmDialog
        open={confirmImageDelete}
        title={t(dictionary, "confirm_title")}
        description={t(dictionary, "image_delete")}
        confirmLabel={t(dictionary, "confirm_delete")}
        cancelLabel={t(dictionary, "confirm_cancel")}
        destructive
        loading={uploadingImage}
        onCancel={() => setConfirmImageDelete(false)}
        onConfirm={() => {
          void handleImageDelete();
          setConfirmImageDelete(false);
        }}
      />
      <Toast open={toast.open} message={toast.message} onClose={toast.hide} />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-[0_20px_80px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
          <ChatWindow
            eventId={eventId}
            onDraftUpdate={setDraft}
            onMissingUpdate={setMissing}
            onSavingChange={setSaving}
          />
        </section>
        <section>
          <EventDraftPanel
            draft={draft}
            missing={missing}
            isSaving={saving}
            eventId={eventId}
            translateLanguage={translateLanguage}
            onTranslateLanguageChange={setTranslateLanguage}
            onTranslate={handleTranslate}
            isTranslating={translating}
          />
          <Card className="mt-6">
            <CardContent className="grid gap-3 p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                {t(dictionary, "image_section")}
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      handleImageUpload(file);
                      if (imageInputRef.current) {
                        imageInputRef.current.value = "";
                      }
                    }
                  }}
                  disabled={uploadingImage}
                />
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={uploadingImage}
                  >
                    {t(dictionary, "image_upload")}
                  </Button>
                  {imageUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      className="text-red-700 hover:bg-red-50 hover:text-red-800"
                      onClick={() => setConfirmImageDelete(true)}
                      disabled={uploadingImage}
                    >
                      {t(dictionary, "image_delete")}
                    </Button>
                  )}
                </div>
                {uploadingImage && (
                  <span className="text-xs text-slate-500">
                    {t(dictionary, "image_working")}
                  </span>
                )}
              </div>
              {imageUrl && (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="relative h-40 w-full">
                    <Image
                      src={imageUrl}
                      alt={t(dictionary, "field_image")}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 384px"
                      unoptimized
                    />
                  </div>
                </div>
              )}
              <p className="text-xs text-slate-500">
                {t(dictionary, "image_hint")}
              </p>
            </CardContent>
          </Card>
        </section>
      </div>

      <section
        id="template-section"
        className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-[0_20px_80px_-40px_rgba(15,23,42,0.45)] backdrop-blur"
      >
        <header className="mb-6">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
            {t(dictionary, "template_section")}
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">
            {t(dictionary, "template_section_title")}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {t(dictionary, "template_section_subtitle")}
          </p>
        </header>
        <TemplateManager
          eventId={eventId}
          eventTitle={typeof draft?.title === "string" ? draft.title : null}
        />
      </section>
    </div>
  );
}
