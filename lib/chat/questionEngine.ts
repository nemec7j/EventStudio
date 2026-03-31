import { normalizeForMatch } from "./normalize";

export type EventDraft = {
  title?: string | null;
  category?: string | null;
  status?: "DRAFT" | "PUBLISHED" | string | null;
  startDateTime?: Date | null;
  endDateTime?: Date | null;
  timezone?: string | null;
  locationName?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  descriptionShort?: string | null;
  descriptionLong?: string | null;
  audience?: string | null;
  priceAmount?: number | null;
  priceCurrency?: string | null;
  isFree?: boolean | null;
  registrationUrl?: string | null;
  organizerName?: string | null;
  organizerEmail?: string | null;
  tags?: unknown;
};

export type DraftField =
  | "title"
  | "startDateTime"
  | "endDateTime"
  | "descriptionLong"
  | "descriptionShort"
  | "locationName";

export type ChatLanguage = "cs" | "en";

const orderedFields: DraftField[] = [
  "title",
  "startDateTime",
  "endDateTime",
  "descriptionLong",
  "descriptionShort",
  "locationName",
];

const questionsByLang: Record<ChatLanguage, Record<DraftField, string>> = {
  cs: {
    title: "Super, pojdme to dotahnout. Jaky je nazev akce?",
    startDateTime:
      "Abychom mohli pokracovat, potrebuji datum a cas zacatku. Kdy akce zacina? (napr. 23.3.2026 v 17h)",
    endDateTime:
      "Skvele. A kdy akce konci? (napr. 23.3.2026 v 19h)",
    descriptionLong: "Potrebuji jeste delsi popis akce. Jak byste ji predstavil(a)?",
    descriptionShort: "Doplnime i kratkou anotaci (1-2 vety). Jak ma znit?",
    locationName: "Posledni povinny udaj: misto konani. Kde se akce uskutecni?",
  },
  en: {
    title: "Great, let's finish this. What is the event title?",
    startDateTime:
      "To continue, I need the event start date and time. When does it start? (e.g. Mar 23, 2026 at 5pm)",
    endDateTime:
      "Great. When does the event end? (e.g. Mar 23, 2026 at 7pm)",
    descriptionLong: "I still need a full event description. How would you describe it?",
    descriptionShort: "Let's also add a short summary (1-2 sentences). What should it say?",
    locationName: "Last required detail: what is the venue?",
  },
};

const fieldLabelMapByLang: Record<ChatLanguage, Record<DraftField, string>> = {
  cs: {
    title: "název akce",
    startDateTime: "začátek akce",
    endDateTime: "konec akce",
    descriptionLong: "popis",
    descriptionShort: "anotace",
    locationName: "místo konání",
  },
  en: {
    title: "event title",
    startDateTime: "event start",
    endDateTime: "event end",
    descriptionLong: "description",
    descriptionShort: "summary",
    locationName: "venue",
  },
};

const fieldAliases: Record<DraftField, string[]> = {
  title: ["title", "nazev", "název akce", "jmeno akce", "event title", "name"],
  startDateTime: [
    "zacatek",
    "začátek akce",
    "datum zacatku",
    "cas zacatku",
    "start",
    "start akce",
    "event start",
    "start time",
  ],
  endDateTime: [
    "konec",
    "konec akce",
    "datum konce",
    "cas konce",
    "end",
    "kdy konci",
    "event end",
    "end time",
  ],
  descriptionLong: [
    "popis",
    "dlouhy popis",
    "detailni popis",
    "description",
    "long description",
  ],
  descriptionShort: ["anotace", "kratky popis", "summary", "short description"],
  locationName: ["misto", "místo konání", "lokace", "location", "venue"],
};

const hasValue = (value: unknown) => {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (value instanceof Date) {
    return !Number.isNaN(value.getTime());
  }
  return true;
};

export function getMissingFields(draft: EventDraft) {
  return orderedFields.filter((field) => !hasValue(draft[field]));
}

export const FINAL_CONFIRMATION_PROMPT: Record<ChatLanguage, string> = {
  cs: "Vše je vyplněné. Klidně napište, co chcete ještě upravit, nebo potvrďte publikaci.",
  en: "Everything is filled in. Tell me what you want to adjust, or confirm publishing.",
};

export const FIELD_SELECTION_PROMPT: Record<ChatLanguage, string> = {
  cs: "Které pole chcete upravit?",
  en: "Which field do you want to update?",
};

export function getNextQuestion(draft: EventDraft, language: ChatLanguage = "cs") {
  const missing = getMissingFields(draft);
  if (missing.length === 0) {
    return {
      missing,
      question: FINAL_CONFIRMATION_PROMPT[language],
    };
  }

  const nextField = missing[0];
  return {
    missing,
    question: questionsByLang[language][nextField],
  };
}

export function getQuestionForField(field: DraftField, language: ChatLanguage = "cs") {
  return questionsByLang[language][field];
}

export function listUpdatableFields(language: ChatLanguage = "cs") {
  return orderedFields.map((field) => fieldLabelMapByLang[language][field]).join(", ");
}

export function getFieldLabel(field: DraftField, language: ChatLanguage = "cs") {
  return fieldLabelMapByLang[language][field];
}

export function formatMissingFields(
  missing: DraftField[],
  language: ChatLanguage = "cs"
) {
  if (!missing.length) {
    return "";
  }
  return missing.map((field) => fieldLabelMapByLang[language][field]).join(", ");
}

export function parseRequestedField(message: string): DraftField | null {
  const normalized = normalizeForMatch(message);
  for (const [field, aliases] of Object.entries(fieldAliases) as Array<
    [DraftField, string[]]
  >) {
    if (
      aliases.some((alias) =>
        normalized.includes(normalizeForMatch(alias))
      )
    ) {
      return field;
    }
  }

  return null;
}

