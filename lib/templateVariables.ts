import type { Event, Prisma } from "@prisma/client";

type EventWithTranslations = Event;

const isJsonObject = (
  value: Prisma.JsonValue | null | undefined
): value is Prisma.JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asRecord = (
  value: Prisma.JsonValue | null | undefined
): Record<string, unknown> =>
  isJsonObject(value) ? (value as Record<string, unknown>) : {};

const asOptionalString = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

const formatDate = (value?: Date | null) => {
  if (!value) {
    return "";
  }
  return value.toLocaleDateString("cs-CZ");
};

const formatTime = (value?: Date | null) => {
  if (!value) {
    return "";
  }
  return value.toLocaleTimeString("cs-CZ", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDateTime = (value?: Date | null) => {
  if (!value) {
    return "";
  }
  return value.toLocaleString("cs-CZ", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const getLocation = (event: Event) =>
  event.locationName ??
  [event.address, event.city, event.country].filter(Boolean).join(", ");

const getPrice = (event: Event) =>
  event.isFree || !event.priceAmount
    ? "Zdarma"
    : `${event.priceAmount} ${event.priceCurrency ?? "CZK"}`;

export function buildTemplateVariables(
  event: EventWithTranslations,
  options: { language?: string } = {}
) {
  const title = event.title ?? "";
  const location = getLocation(event);
  const language = options.language?.toLowerCase() || "cs";
  const translationData = asRecord(event.translations);
  const localized =
    language !== "cs"
      ? asRecord(translationData[language] as Prisma.JsonValue | undefined)
      : null;
  const localizedTitle = asOptionalString(localized?.title) ?? title;
  const localizedShort =
    asOptionalString(localized?.descriptionShort) ?? event.descriptionShort ?? "";
  const localizedLong =
    asOptionalString(localized?.descriptionLong) ?? event.descriptionLong ?? "";
  const localizedAudience =
    asOptionalString(localized?.audience) ?? event.audience ?? "";
  const localizedOrganizer =
    asOptionalString(localized?.organizerName) ?? event.organizerName ?? "";
  const localizedTags = localized?.tags ?? event.tags;
  const assets = Array.isArray(event.assets) ? event.assets : [];
  const imageUrl = (() => {
    for (const asset of assets) {
      if (
        asset &&
        typeof asset === "object" &&
        "url" in asset &&
        typeof (asset as { url?: unknown }).url === "string"
      ) {
        return (asset as { url?: string }).url ?? "";
      }
    }
    return "";
  })();
  const imageFallback =
    "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
  const translations: Record<
    string,
    {
      invitation: string;
      place: string;
      start: string;
      end: string;
      annotation: string;
      description: string;
      registration: string;
      footer: string;
      generated: string;
      imageAlt: string;
    }
  > = {
    cs: {
      invitation: "Pozvanka na akci",
      place: "Misto konani",
      start: "Zacatek",
      end: "Konec",
      annotation: "Anotace",
      description: "Popis",
      registration: "Registrace",
      footer: "Tento material byl vygenerovan automaticky z Event Studia.",
      generated: "(c)",
      imageAlt: "Fotografie hotelu nebo udalosti",
    },
    en: {
      invitation: "Event Invitation",
      place: "Venue",
      start: "Start",
      end: "End",
      annotation: "Summary",
      description: "Description",
      registration: "Registration",
      footer: "This material was generated automatically from Event Studio.",
      generated: "(c)",
      imageAlt: "Event or venue photo",
    },
    de: {
      invitation: "Einladung zur Veranstaltung",
      place: "Veranstaltungsort",
      start: "Beginn",
      end: "Ende",
      annotation: "Kurzinfo",
      description: "Beschreibung",
      registration: "Anmeldung",
      footer:
        "Dieses Material wurde automatisch aus Event Studio generiert.",
      generated: "(c)",
      imageAlt: "Foto der Veranstaltung oder des Veranstaltungsorts",
    },
    pl: {
      invitation: "Zaproszenie na wydarzenie",
      place: "Miejsce",
      start: "Poczatek",
      end: "Koniec",
      annotation: "Zajawka",
      description: "Opis",
      registration: "Rejestracja",
      footer:
        "Ten material zostal wygenerowany automatycznie z Event Studio.",
      generated: "(c)",
      imageAlt: "Zdjecie wydarzenia lub miejsca",
    },
  };
  const t = translations[language] ?? translations.cs;

  return {
    title: localizedTitle,
    start_date: formatDate(event.startDateTime),
    start_time: formatTime(event.startDateTime),
    end_date: formatDate(event.endDateTime),
    location,
    city: event.city ?? "",
    price: getPrice(event),
    registration_url: event.registrationUrl ?? "",
    description_short: localizedShort,
    description_long: localizedLong,
    organizer_name: localizedOrganizer,
    audience: localizedAudience,
    tags: Array.isArray(localizedTags)
      ? localizedTags.map((tag: unknown) => String(tag)).join(", ")
      : "",
    nazev_akce: localizedTitle,
    misto_konani: location,
    zacatek_akce: formatDateTime(event.startDateTime),
    konec_akce: formatDateTime(event.endDateTime),
    anotace: localizedShort,
    popis: localizedLong,
    registrace_url: event.registrationUrl ?? "",
    image_url: imageUrl || imageFallback,
    lang: language,
    language,
    t_invitation: t.invitation,
    t_place: t.place,
    t_start: t.start,
    t_end: t.end,
    t_annotation: t.annotation,
    t_description: t.description,
    t_registration: t.registration,
    t_footer: t.footer,
    t_generated: t.generated,
    t_image_alt: t.imageAlt,
  };
}
