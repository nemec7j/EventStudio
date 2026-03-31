import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useLanguage } from "@/components/LanguageProvider";
import { t } from "@/lib/i18n";

type EventDraftPanelProps = {
  draft?: Record<string, unknown> | null;
  missing?: string[];
  isSaving?: boolean;
  eventId?: string;
  translateLanguage?: string;
  onTranslateLanguageChange?: (language: string) => void;
  onTranslate?: () => void;
  isTranslating?: boolean;
};

const getLocalizedDraft = (
  draft: Record<string, unknown> | null | undefined,
  language: string | undefined
) => {
  if (!draft || !language || language === "cs") {
    return draft ?? null;
  }
  const translations = draft.translations;
  if (
    translations &&
    typeof translations === "object" &&
    language in (translations as Record<string, unknown>)
  ) {
    const localized = (translations as Record<string, unknown>)[language];
    if (localized && typeof localized === "object") {
      return { ...draft, ...(localized as Record<string, unknown>) };
    }
  }
  return draft;
};

const getImageUrl = (draft?: Record<string, unknown> | null) => {
  const assets = draft?.assets;
  if (Array.isArray(assets)) {
    const image = assets.find(
      (asset) =>
        asset &&
        typeof asset === "object" &&
        "url" in asset &&
        (asset as { url?: string }).url
    ) as { url?: string } | undefined;
    return image?.url;
  }
  return undefined;
};

const formatValue = (value: unknown) => {
  const formatter = new Intl.DateTimeFormat("cs-CZ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (Array.isArray(value)) {
    return value.length ? value.join(", ") : "-";
  }

  if (typeof value === "string") {
    const parsedDate = new Date(value);
    if (!Number.isNaN(parsedDate.getTime()) && /\d{4}-\d{2}-\d{2}/.test(value)) {
      return formatter.format(parsedDate);
    }
    return value;
  }

  if (value instanceof Date) {
    return formatter.format(value);
  }

  return String(value);
};

export default function EventDraftPanel({
  draft,
  missing = [],
  isSaving = false,
  eventId: eventIdProp,
  translateLanguage = "en",
  onTranslateLanguageChange,
  onTranslate,
  isTranslating = false,
}: EventDraftPanelProps) {
  const { dictionary, language } = useLanguage();
  const displayLanguage = translateLanguage ?? language;
  const eventId =
    eventIdProp ?? (typeof draft?.id === "string" ? draft.id : null);
  const localizedDraft = getLocalizedDraft(draft, displayLanguage);
  const status =
    draft?.status === "PUBLISHED"
      ? t(dictionary, "draft_status_done")
      : t(dictionary, "draft_status_draft");
  const badgeVariant =
    missing.length === 0 ? "success" : missing.length > 2 ? "warning" : "default";

  const summaryFields = [
    {
      key: "title",
      label: t(dictionary, "field_title"),
      value: localizedDraft?.title,
    },
    {
      key: "startDateTime",
      label: t(dictionary, "field_start"),
      value: draft?.startDateTime,
    },
    {
      key: "endDateTime",
      label: t(dictionary, "field_end"),
      value: draft?.endDateTime,
    },
    {
      key: "descriptionLong",
      label: t(dictionary, "field_desc_long"),
      value: localizedDraft?.descriptionLong,
    },
    {
      key: "descriptionShort",
      label: t(dictionary, "field_desc_short"),
      value: localizedDraft?.descriptionShort,
    },
    {
      key: "locationName",
      label: t(dictionary, "field_location"),
      value: draft?.locationName,
    },
    { key: "imageUrl", label: t(dictionary, "field_image"), value: getImageUrl(draft) },
  ];

  const nextMissing = missing[0];

  return (
    <Card>
      <CardHeader className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
            {t(dictionary, "draft_status_title")}
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">
            {t(dictionary, "draft_required_title")}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {isSaving
              ? t(dictionary, "draft_saving")
              : missing.length === 0
              ? t(dictionary, "draft_complete")
              : t(dictionary, "draft_missing", { count: missing.length })}
          </p>
          {nextMissing && (
            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-400">
              {t(dictionary, "draft_next_field", { field: nextMissing })}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-3">
          <Badge variant={badgeVariant}>{status}</Badge>
          <select
            className="h-9 rounded-full border border-slate-200 bg-white px-3 text-xs text-slate-600"
            value={translateLanguage}
            onChange={(event) => onTranslateLanguageChange?.(event.target.value)}
          >
            <option value="cs">CS</option>
            <option value="en">EN</option>
            <option value="de">DE</option>
            <option value="pl">PL</option>
          </select>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        {summaryFields.map((field) => (
          <div
            key={field.key}
            className="flex items-start justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm"
          >
            <span className="text-slate-500">{field.label}</span>
            <span className="text-right font-medium text-slate-900">{formatValue(field.value)}</span>
          </div>
        ))}
        <div className="grid gap-3 sm:grid-cols-2">
          {eventId ? (
          <Button type="button" variant="outline" asChild>
            <Link href={`/events/${eventId}/template`}>
              {t(dictionary, "draft_prepare")}
            </Link>
          </Button>
        ) : (
          <Button type="button" variant="outline" disabled>
            {t(dictionary, "draft_prepare")}
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          disabled={isTranslating || translateLanguage === "cs"}
          onClick={onTranslate}
        >
          {isTranslating
            ? t(dictionary, "draft_translating")
            : t(dictionary, "draft_translate")}
        </Button>
        </div>
      </CardContent>
    </Card>
  );
}
