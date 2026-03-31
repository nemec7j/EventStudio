import type { EventDraft } from "./questionEngine";
import { normalizeForMatch } from "./normalize";

type ExtractionOptions = {
  expectedField?: string;
  referenceDateTime?: Date | string | null;
  existingTitle?: string | null;
  language?: "cs" | "en";
};

const urlPattern = /(https?:\/\/[^\s]+)/i;
const emailPattern = /([^\s@]+@[^\s@]+\.[^\s@]+)/i;

const isoDatePatternGlobal = /\b(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2})(?::(\d{2}))?)?\b/g;
const czDatePatternGlobal =
  /\b(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})(?:\.)?(?:\s*(?:v)?\s*(\d{1,2})(?::(\d{2}))?\s*h?)?\b/g;
const czDateWithoutYearPatternGlobal =
  /\b(\d{1,2})[.\-/](\d{1,2})(?![.\-/]\d{2,4})(?:\.)?(?:\s*(?:v)?\s*(\d{1,2})(?::(\d{2}))?\s*h?)?\b/g;
const czMonthDatePatternGlobal =
  /\b(\d{1,2})\.?\s*(ledna|leden|unora|unor|brezna|brezen|dubna|duben|kvetna|kveten|cervna|cerven|cervence|cervenec|srpna|srpen|zari|rijna|rijen|listopadu|listopad|prosince|prosinec)(?:\s*(\d{4}))?(?:\s*(?:v)?\s*(\d{1,2})(?::(\d{2}))?\s*h?)?(?:\s*(?:do|-|az)\s*(\d{1,2})(?::(\d{2}))?\s*h?)?\b/g;
const enDayMonthDatePatternGlobal =
  /\b(\d{1,2})(?:st|nd|rd|th)?\s*(?:of\s+)?(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)(?:\s*,?\s*(\d{4}))?(?:\s*(?:at)?\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?\b/gi;
const enMonthDayDatePatternGlobal =
  /\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,?\s*(\d{4}))?(?:\s*(?:at)?\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?\b/gi;
const timeRangePattern =
  /\b(?:v\s*)?(\d{1,2})(?::(\d{2}))?\s*h?\s*(?:do|-|az)\s*(\d{1,2})(?::(\d{2}))?\s*h?\b/i;
const timeOnlyPattern = /\b(\d{1,2})(?::(\d{2}))?\s*(?:h|hod)\b/i;
const timeOnlyClockPattern = /\b(\d{1,2}):(\d{2})\b/i;
const timeOnlyAmPmPattern = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i;
const endTimeAfterKeywordPattern =
  /\b(?:konec|konci|koncit|end|ending)\b[^\d]{0,80}(\d{1,2})(?::(\d{2}))?\s*(?:h|hod)?\b/i;
const titleLocationPattern =
  /\bna\s+(\p{Lu}[\p{L}\p{N}_-]*(?:\s+\p{Lu}[\p{L}\p{N}_-]*){0,3})/u;
const locationEventSentencePattern =
  /\b(?:bude|je|will|is)\s+(?:se\s+)?(?:konat|kona|uskutecni|probihat|held|takes place)\s+(?:v|ve|na|in|at)\s+([^.!?\n]+)/i;

const monthNameToNumber: Record<string, number> = {
  leden: 1,
  ledna: 1,
  unor: 2,
  unora: 2,
  brezen: 3,
  brezna: 3,
  duben: 4,
  dubna: 4,
  kveten: 5,
  kvetna: 5,
  cerven: 6,
  cervna: 6,
  cervenec: 7,
  cervence: 7,
  srpen: 8,
  srpna: 8,
  zari: 9,
  rijen: 10,
  rijna: 10,
  listopad: 11,
  listopadu: 11,
  prosinec: 12,
  prosince: 12,
};

const enMonthNameToNumber: Record<string, number> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
};

const titlePatterns = [
  /(?:nĂˇzev|title)\s*[:\-]\s*(.+)/i,
  /(?:event|ud[aĂˇ]lost)\s*[:\-]\s*(.+)/i,
];

const titlePatternsNormalized = [
  /(?:nazev|title)\s*[:\-]\s*(.+)/i,
  /(?:event|udalost)\s*[:\-]\s*(.+)/i,
];
const titleCommandPattern =
  /(?:uprav|upravit|zmen|zmenit|prejmenuj|rename|change|adjust|improve)\s+(?:nazev(?:\s+akce)?|title)\s*(?:na|to|:|-)\s*(.+)$/i;
const titleCommandSimplePattern =
  /(?:nazev(?:\s+akce)?|title)\s*(?:na|to|:|-)\s*(.+)$/i;

const locationPatterns = [
  /(?:m[iĂ­]sto|lokace|location)\s*[:\-]\s*(.+)/i,
  /(?:m[iĂ­]sto|lokace|location)\s*(?:je|is)\s+(.+)/i,
];
const locationSentencePattern =
  /(?:m[íi]sto|misto|lokace|location)\s*(?:je|is)\s+([^.!?\n]+)/i;

const locationPatternsNormalized = [
  /(?:misto|lokace|location)\s*[:\-]\s*(.+)/i,
  /(?:misto|lokace|location)\s*(?:je|is)\s+(.+)/i,
];

const addressPattern = /(?:adresa|address)\s*[:\-]\s*(.+)/i;
const addressPatternNormalized = /(?:adresa|address)\s*[:\-]\s*(.+)/i;
const cityPattern = /(?:m[eÄ›]sto|city)\s*[:\-]\s*(.+)/i;
const cityPatternNormalized = /(?:mesto|city)\s*[:\-]\s*(.+)/i;
const countryPattern = /(?:zem[eÄ›]|country)\s*[:\-]\s*(.+)/i;
const countryPatternNormalized = /(?:zeme|country)\s*[:\-]\s*(.+)/i;
const audiencePattern = /(?:pro koho|audience|c[iĂ­]lovka)\s*[:\-]\s*(.+)/i;
const audiencePatternNormalized = /(?:pro koho|audience|cilovka)\s*[:\-]\s*(.+)/i;
const organizerPattern =
  /(?:organiz[aĂˇ]tor|po[Ĺ™r]adatel)\s*[:\-]\s*(.+)/i;
const organizerPatternNormalized =
  /(?:organizator|poradatel)\s*[:\-]\s*(.+)/i;

const timezonePattern =
  /(?:time ?zone|timezone|[cÄŤ]asov[aĂˇ] z[oĂł]na)\s*[:\-]\s*(.+)/i;
const timezonePatternNormalized =
  /(?:time ?zone|timezone|casova zona)\s*[:\-]\s*(.+)/i;

const categoryMap: Record<string, string> = {
  konference: "CONFERENCE",
  conference: "CONFERENCE",
  promo: "PROMO",
  interni: "INTERNAL",
  "internĂ­": "INTERNAL",
  internal: "INTERNAL",
  jina: "OTHER",
  jinĂˇ: "OTHER",
  other: "OTHER",
};

const pricePattern = /(\d+[,.]?\d*)\s*(k[ÄŤc]|czk|eur|â‚¬|usd|\$)/i;

const tagLabelPattern = /(?:tagy|tags|[Ĺˇs]t[iĂ­]tky)\s*[:\-]\s*(.+)/i;
const tagLabelPatternNormalized = /(?:tagy|tags|stitky)\s*[:\-]\s*(.+)/i;
const hashTagPattern = /#([\p{L}\p{N}_-]+)/gu;

const normalizeText = (text: string) => text.trim();
const cleanSingleFieldValue = (value: string) =>
  value
    .split(/[.!?]/)[0]
    .replace(/[,\-–:]+$/, "")
    .trim();
const cleanLocationValue = (value: string) =>
  cleanSingleFieldValue(value)
    .replace(
      /\s+(?:a|and)\s+(?:uprav|upravit|zmen|zmenit|vygeneruj|vygenerovat|vytvor|vytvorit|rename|adjust|improve|generate|create)\b.*$/i,
      ""
    )
    .trim();
const isControlLikeReply = (value: string) => {
  const normalized = normalizeForMatch(value);
  if (!normalized) {
    return true;
  }
  const shortReplies = new Set([
    "ano",
    "ne",
    "yes",
    "no",
    "ok",
    "okej",
    "okey",
    "jasne",
    "jiste",
    "nazev akce",
    "event title",
  ]);
  if (shortReplies.has(normalized)) {
    return true;
  }
  const isDirectiveAboutFields =
    normalized.length < 220 &&
    /\b(vygeneruj|vygenerovat|vytvor|vytvorit|navrhni|uprav|upravit|zmen|zmenit|generate|create|draft|rewrite|rename|adjust|improve)\b/.test(
      normalized
    ) &&
    /\b(popis|anotac|nazev|title|description|summary)\b/.test(normalized);
  if (isDirectiveAboutFields) {
    return true;
  }
  return (
    normalized.includes("potrebuji pomoc") ||
    normalized.includes("potrebuju pomoc") ||
    normalized.includes("se zbytkem potrebuji pomoc") ||
    normalized.includes("zbytek potrebuji pomoc") ||
    normalized.includes("help me") ||
    normalized.includes("i need help")
  );
};
const valueAfterLabel = (message: string) => {
  const match = message.match(/[:\-]\s*(.+)$/);
  if (match?.[1]) {
    return match[1].trim();
  }
  return null;
};
const matchLabelValue = (
  message: string,
  normalizedMessage: string,
  patterns: RegExp[],
  normalizedPatterns: RegExp[]
) => {
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match?.[1]) {
      return normalizeText(match[1]);
    }
  }
  for (const pattern of normalizedPatterns) {
    const match = normalizedMessage.match(pattern);
    if (match?.[1]) {
      return normalizeText(match[1]);
    }
    if (pattern.test(normalizedMessage)) {
      const value = valueAfterLabel(message);
      if (value) {
        return normalizeText(value);
      }
    }
  }
  return null;
};

const toDate = (
  yearRaw: string,
  monthRaw: string,
  dayRaw: string,
  hourRaw?: string,
  minuteRaw?: string,
  meridiemRaw?: string
) => {
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  let hour = hourRaw ? Number(hourRaw) : 0;
  const minute = minuteRaw ? Number(minuteRaw) : 0;
  const meridiem = meridiemRaw?.toLowerCase();

  if (meridiem === "am" || meridiem === "pm") {
    if (Number.isNaN(hour) || hour < 1 || hour > 12) {
      return null;
    }
    if (meridiem === "am" && hour === 12) {
      hour = 0;
    }
    if (meridiem === "pm" && hour !== 12) {
      hour += 12;
    }
  }

  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    Number.isNaN(hour) ||
    Number.isNaN(minute)
  ) {
    return null;
  }

  const parsed = new Date(year, month - 1, day, hour, minute);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
};

const parseDates = (message: string, language: "cs" | "en" = "cs") => {
  const parsedDates: Date[] = [];
  const currentYear = String(new Date().getFullYear());

  const normalizedMessage = normalizeForMatch(message);
  for (const match of normalizedMessage.matchAll(czMonthDatePatternGlobal)) {
    const month = monthNameToNumber[match[2]];
    if (!month) {
      continue;
    }
    const year = match[3] ?? currentYear;
    const start = toDate(year, String(month), match[1], match[4], match[5]);
    if (start) {
      parsedDates.push(start);
    }
    if (match[6]) {
      const end = toDate(year, String(month), match[1], match[6], match[7]);
      if (end) {
        parsedDates.push(end);
      }
    }
  }

  if (language === "en") {
    for (const match of normalizedMessage.matchAll(enDayMonthDatePatternGlobal)) {
      const month = enMonthNameToNumber[match[2]];
      if (!month) {
        continue;
      }
      const year = match[3] ?? currentYear;
      const parsed = toDate(
        year,
        String(month),
        match[1],
        match[4],
        match[5],
        match[6]
      );
      if (parsed) {
        parsedDates.push(parsed);
      }
    }

    for (const match of normalizedMessage.matchAll(enMonthDayDatePatternGlobal)) {
      const month = enMonthNameToNumber[match[1]];
      if (!month) {
        continue;
      }
      const year = match[3] ?? currentYear;
      const parsed = toDate(
        year,
        String(month),
        match[2],
        match[4],
        match[5],
        match[6]
      );
      if (parsed) {
        parsedDates.push(parsed);
      }
    }
  }

  for (const match of message.matchAll(czDateWithoutYearPatternGlobal)) {
    const parsed = toDate(currentYear, match[2], match[1], match[3], match[4]);
    if (parsed) {
      parsedDates.push(parsed);
    }
  }

  for (const match of message.matchAll(czDatePatternGlobal)) {
    const parsed = toDate(match[3], match[2], match[1], match[4], match[5]);
    if (parsed) {
      parsedDates.push(parsed);
    }
  }

  for (const match of message.matchAll(isoDatePatternGlobal)) {
    const parsed = toDate(match[1], match[2], match[3], match[4], match[5]);
    if (parsed) {
      parsedDates.push(parsed);
    }
  }

  if (parsedDates.length === 1) {
    const rangeMatch = message.match(timeRangePattern);
    if (rangeMatch) {
      const base = parsedDates[0];
      const startHour = Number(rangeMatch[1]);
      const startMinute = rangeMatch[2] ? Number(rangeMatch[2]) : 0;
      const endHour = Number(rangeMatch[3]);
      const endMinute = rangeMatch[4] ? Number(rangeMatch[4]) : 0;
      if (
        !Number.isNaN(startHour) &&
        !Number.isNaN(startMinute) &&
        !Number.isNaN(endHour) &&
        !Number.isNaN(endMinute)
      ) {
        parsedDates[0] = new Date(
          base.getFullYear(),
          base.getMonth(),
          base.getDate(),
          startHour,
          startMinute
        );
        parsedDates.push(
          new Date(
            base.getFullYear(),
            base.getMonth(),
            base.getDate(),
            endHour,
            endMinute
          )
        );
      }
    }
  }

  return parsedDates;
};

const parseTimeOnlyWithReference = (
  message: string,
  referenceDateTime?: Date | string | null,
  language: "cs" | "en" = "cs"
) => {
  if (!referenceDateTime) {
    return null;
  }

  const reference =
    referenceDateTime instanceof Date
      ? referenceDateTime
      : new Date(referenceDateTime);
  if (Number.isNaN(reference.getTime())) {
    return null;
  }

  const explicitTimeMatch =
    message.match(timeOnlyPattern) ??
    message.match(timeOnlyClockPattern) ??
    (language === "en" ? message.match(timeOnlyAmPmPattern) : null);
  if (!explicitTimeMatch?.[1]) {
    return null;
  }

  let hour = Number(explicitTimeMatch[1]);
  const minute = explicitTimeMatch[2] ? Number(explicitTimeMatch[2]) : 0;
  const meridiem = explicitTimeMatch[3]?.toLowerCase();
  if (meridiem === "am" || meridiem === "pm") {
    if (hour < 1 || hour > 12) {
      return null;
    }
    if (meridiem === "am" && hour === 12) {
      hour = 0;
    }
    if (meridiem === "pm" && hour !== 12) {
      hour += 12;
    }
  }
  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return new Date(
    reference.getFullYear(),
    reference.getMonth(),
    reference.getDate(),
    hour,
    minute
  );
};

const parseHourMinute = (hourRaw: string, minuteRaw?: string) => {
  const hour = Number(hourRaw);
  const minute = minuteRaw ? Number(minuteRaw) : 0;
  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }
  return { hour, minute };
};

const hasEndIntent = (normalizedMessage: string) =>
  /\b(konec|konci|koncit|end|ending|finish)\b/i.test(normalizedMessage);

const hasStartIntent = (normalizedMessage: string) =>
  /\b(zacatek|zacina|zacinat|start|begin|begins)\b/i.test(normalizedMessage);

const wantsTitleRefinement = (normalizedMessage: string) =>
  (/\b(uprav|upravit|zmen|zmenit|rename|adjust|improve)\b/i.test(
    normalizedMessage
  ) &&
    /\b(nazev|title)\b/i.test(normalizedMessage)) ||
  /\buprav nazev\b/i.test(normalizedMessage);

const cleanTitleCandidate = (value: string) =>
  value
    .replace(/,\s*kter[yaeěéáýíóúů]+\s+se\s+bude\s+konat.*$/i, "")
    .replace(/\s+kter[yaeěéáýíóúů]+\s+se\s+bude\s+konat.*$/i, "")
    .replace(/,\s*dne\s*$/i, "")
    .replace(/\s+dne\s*$/i, "")
    .replace(/,\s*(which|that)\s+.*$/i, "")
    .replace(/\s+(which|that)\s+.*$/i, "")
    .replace(/\s+(?:se\s+)?bude\s+konat.*$/i, "")
    .replace(/[,\-–:]+$/, "")
    .trim();

const parseCategory = (message: string) => {
  const normalized = normalizeForMatch(message);
  for (const [key, value] of Object.entries(categoryMap)) {
    if (normalized.includes(normalizeForMatch(key))) {
      return value;
    }
  }
  return null;
};

const parseTimezone = (message: string) => {
  const tzMatch = message.match(timezonePattern);
  if (tzMatch?.[1]) {
    return normalizeText(tzMatch[1]);
  }

  const normalized = normalizeForMatch(message);
  if (timezonePatternNormalized.test(normalized)) {
    const value = valueAfterLabel(message);
    if (value) {
      return normalizeText(value);
    }
  }
  if (normalized.includes("cet") || normalized.includes("cest")) {
    return "Europe/Prague";
  }
  if (normalized.includes("utc")) {
    return "UTC";
  }
  return null;
};

const parsePrice = (message: string) => {
  const lower = message.toLowerCase();
  if (lower.includes("zdarma") || lower.includes("free")) {
    return {
      isFree: true,
      priceAmount: null,
      priceCurrency: null,
    };
  }

  const match = message.match(pricePattern);
  if (!match) {
    return null;
  }

  const amount = Number(match[1].replace(",", "."));
  if (Number.isNaN(amount)) {
    return null;
  }

  const currencyRaw = match[2].toLowerCase();
  let currency = "CZK";
  if (currencyRaw.includes("â‚¬") || currencyRaw.includes("eur")) {
    currency = "EUR";
  } else if (currencyRaw.includes("$") || currencyRaw.includes("usd")) {
    currency = "USD";
  }

  return {
    isFree: false,
    priceAmount: amount,
    priceCurrency: currency,
  };
};

const parseTags = (message: string, normalizedMessage: string) => {
  const tagMatch = message.match(tagLabelPattern);
  if (tagMatch?.[1]) {
    return tagMatch[1]
      .split(",")
      .map((tag) => normalizeText(tag))
      .filter(Boolean);
  }
  if (tagLabelPatternNormalized.test(normalizedMessage)) {
    const value = valueAfterLabel(message);
    if (value) {
      return value
        .split(",")
        .map((tag) => normalizeText(tag))
        .filter(Boolean);
    }
  }

  const tags = Array.from(message.matchAll(hashTagPattern)).map((match) =>
    normalizeText(match[1])
  );

  return tags.length > 0 ? tags : null;
};

export function extractEventFields(
  message: string,
  options: ExtractionOptions = {}
): Partial<EventDraft> {
  const trimmed = normalizeText(message);
  const updates: Partial<EventDraft> = {};
  const normalizedOriginalMessage = normalizeForMatch(trimmed);

  const correctionPrefix = /^(?:uprav|zm[eÄ›]Ĺ|zmen|zmÄ›nit)\s+/i;
  const effectiveMessage = trimmed.replace(correctionPrefix, "");
  const normalizedMessage = normalizeForMatch(effectiveMessage);

  const urlMatch = effectiveMessage.match(urlPattern);
  if (urlMatch) {
    updates.registrationUrl = urlMatch[1];
  }

  const emailMatch = effectiveMessage.match(emailPattern);
  if (emailMatch) {
    updates.organizerEmail = emailMatch[1];
  }

  const titleValue = matchLabelValue(
    effectiveMessage,
    normalizedMessage,
    titlePatterns,
    titlePatternsNormalized
  );
  const titleCommandMatch =
    effectiveMessage.match(titleCommandPattern) ??
    effectiveMessage.match(titleCommandSimplePattern);
  if (titleValue) {
    updates.title = cleanTitleCandidate(titleValue);
  } else if (titleCommandMatch?.[1]) {
    updates.title = cleanTitleCandidate(titleCommandMatch[1]);
  } else if (
    wantsTitleRefinement(normalizedOriginalMessage) &&
    typeof options.existingTitle === "string" &&
    options.existingTitle.trim().length > 0
  ) {
    const cleanedExistingTitle = cleanTitleCandidate(options.existingTitle);
    if (cleanedExistingTitle) {
      updates.title = cleanedExistingTitle;
    }
  }

  const category = parseCategory(effectiveMessage);
  if (category) {
    updates.category = category;
  }

  const tz = parseTimezone(effectiveMessage);
  if (tz) {
    updates.timezone = tz;
  }

  const locationValue = matchLabelValue(
    effectiveMessage,
    normalizedMessage,
    locationPatterns,
    locationPatternsNormalized
  );
  const locationSentenceMatch = effectiveMessage.match(locationSentencePattern);
  const locationEventSentenceMatch = effectiveMessage.match(locationEventSentencePattern);
  if (locationSentenceMatch?.[1]) {
    updates.locationName = cleanLocationValue(locationSentenceMatch[1]);
  } else if (locationEventSentenceMatch?.[1]) {
    updates.locationName = cleanLocationValue(locationEventSentenceMatch[1]);
  } else if (locationValue) {
    updates.locationName = cleanLocationValue(locationValue);
  } else if (options.expectedField === "title") {
    const titleLocationMatch = effectiveMessage.match(titleLocationPattern);
    if (titleLocationMatch?.[1]) {
      updates.locationName = cleanLocationValue(titleLocationMatch[1]);
    }
  }

  const addressValue = matchLabelValue(
    effectiveMessage,
    normalizedMessage,
    [addressPattern],
    [addressPatternNormalized]
  );
  if (addressValue) {
    updates.address = addressValue;
  }

  const cityValue = matchLabelValue(
    effectiveMessage,
    normalizedMessage,
    [cityPattern],
    [cityPatternNormalized]
  );
  if (cityValue) {
    updates.city = cityValue;
  }

  const countryValue = matchLabelValue(
    effectiveMessage,
    normalizedMessage,
    [countryPattern],
    [countryPatternNormalized]
  );
  if (countryValue) {
    updates.country = countryValue;
  }

  const audienceValue = matchLabelValue(
    effectiveMessage,
    normalizedMessage,
    [audiencePattern],
    [audiencePatternNormalized]
  );
  if (audienceValue) {
    updates.audience = audienceValue;
  }

  const organizerValue = matchLabelValue(
    effectiveMessage,
    normalizedMessage,
    [organizerPattern],
    [organizerPatternNormalized]
  );
  if (organizerValue) {
    updates.organizerName = organizerValue;
  }

  const price = parsePrice(effectiveMessage);
  if (price) {
    updates.isFree = price.isFree ?? null;
    updates.priceAmount = price.priceAmount ?? null;
    updates.priceCurrency = price.priceCurrency ?? null;
  }

  const tags = parseTags(effectiveMessage, normalizedMessage);
  if (tags) {
    updates.tags = tags;
  }

  const parseLanguage = options.language ?? "cs";
  const parsedDates = parseDates(effectiveMessage, parseLanguage);
  const firstDate = parsedDates[0];
  let secondDate = parsedDates[1];
  const endIntent = hasEndIntent(normalizedOriginalMessage);
  const startIntent = hasStartIntent(normalizedOriginalMessage);

  if (firstDate && !secondDate && endIntent) {
    const endTimeMatch = effectiveMessage.match(endTimeAfterKeywordPattern);
    if (endTimeMatch?.[1]) {
      const parsedTime = parseHourMinute(endTimeMatch[1], endTimeMatch[2]);
      if (parsedTime) {
        const candidateEnd = new Date(
          firstDate.getFullYear(),
          firstDate.getMonth(),
          firstDate.getDate(),
          parsedTime.hour,
          parsedTime.minute
        );
        const hasDifferentTime =
          candidateEnd.getHours() !== firstDate.getHours() ||
          candidateEnd.getMinutes() !== firstDate.getMinutes();
        if (hasDifferentTime) {
          secondDate = candidateEnd;
        }
      }
    }
  }

  if (firstDate && secondDate) {
    updates.startDateTime = firstDate;
    updates.endDateTime = secondDate;
  } else if (firstDate) {
    if (endIntent && !startIntent && options.expectedField !== "startDateTime") {
      updates.endDateTime = firstDate;
    } else if (
      startIntent &&
      !endIntent &&
      options.expectedField !== "endDateTime"
    ) {
      updates.startDateTime = firstDate;
    } else if (options.expectedField === "endDateTime") {
      updates.endDateTime = firstDate;
    } else {
      updates.startDateTime = firstDate;
    }
  }

  const dateTargetField =
    endIntent && !startIntent
      ? "endDateTime"
      : startIntent && !endIntent
      ? "startDateTime"
      : options.expectedField === "startDateTime" || options.expectedField === "endDateTime"
      ? options.expectedField
      : undefined;

  if (!firstDate && dateTargetField) {
    const sameDayTime = parseTimeOnlyWithReference(
      effectiveMessage,
      options.referenceDateTime,
      parseLanguage
    );
    if (sameDayTime) {
      if (dateTargetField === "endDateTime") {
        updates.endDateTime = sameDayTime;
      } else {
        updates.startDateTime = sameDayTime;
      }
    }
  }

  if (options.expectedField === "descriptionShort") {
    if (Object.keys(updates).length === 0 && !isControlLikeReply(trimmed)) {
      updates.descriptionShort = trimmed;
    }
  } else if (options.expectedField === "descriptionLong") {
    if (Object.keys(updates).length === 0 && !isControlLikeReply(trimmed)) {
      updates.descriptionLong = trimmed;
    }
  } else if (options.expectedField === "title" && !updates.title) {
    if (isControlLikeReply(trimmed)) {
      const cleanedExistingTitle =
        typeof options.existingTitle === "string"
          ? cleanTitleCandidate(options.existingTitle)
          : "";
      if (cleanedExistingTitle) {
        updates.title = cleanedExistingTitle;
      }
    } else {
      if (firstDate) {
        const titleSplitPattern =
          options.language === "en"
            ? /\b(?:day\s+)?\d{1,2}(?:st|nd|rd|th)?(?:\s|[.\-/])/i
            : /\b\d{1,2}(?:\s|[.\-/])/i;
        const titleBeforeDate = trimmed
          .split(titleSplitPattern)[0]
          ?.replace(/[,\-–:]+$/, "")
          .trim();
        const candidate = cleanTitleCandidate(
          titleBeforeDate
        );
        const fallback = cleanTitleCandidate(trimmed);
        const existingFallback =
          typeof options.existingTitle === "string"
            ? cleanTitleCandidate(options.existingTitle)
            : "";
        updates.title =
          candidate && candidate.length > 2
            ? candidate
            : fallback && fallback.length > 2
            ? fallback
            : existingFallback && existingFallback.length > 2
            ? existingFallback
            : trimmed;
      } else {
        const candidate = cleanTitleCandidate(trimmed);
        updates.title = candidate && candidate.length > 2 ? candidate : trimmed;
      }
    }
  } else if (options.expectedField === "category" && !updates.category) {
    const manualCategory = parseCategory(trimmed);
    if (manualCategory) {
      updates.category = manualCategory;
    } else {
      updates.category = trimmed.toUpperCase();
    }
  } else if (options.expectedField === "timezone" && !updates.timezone) {
    updates.timezone = trimmed;
  } else if (options.expectedField === "locationName" && !updates.locationName) {
    const locationCandidate = cleanLocationValue(trimmed);
    updates.locationName = locationCandidate || trimmed;
  } else if (options.expectedField === "address" && !updates.address) {
    updates.address = trimmed;
  } else if (options.expectedField === "city" && !updates.city) {
    updates.city = trimmed;
  } else if (options.expectedField === "country" && !updates.country) {
    updates.country = trimmed;
  } else if (options.expectedField === "audience" && !updates.audience) {
    updates.audience = trimmed;
  } else if (
    options.expectedField === "registrationUrl" &&
    !updates.registrationUrl
  ) {
    updates.registrationUrl = trimmed;
  } else if (
    options.expectedField === "organizerName" &&
    !updates.organizerName
  ) {
    updates.organizerName = trimmed;
  } else if (
    options.expectedField === "organizerEmail" &&
    !updates.organizerEmail
  ) {
    updates.organizerEmail = trimmed;
  }

  if (options.expectedField === "tags" && !updates.tags) {
    updates.tags = trimmed
      .split(",")
      .map((tag) => normalizeText(tag))
      .filter(Boolean);
  }

  if (options.expectedField === "price" && !price) {
    const manualPrice = parsePrice(trimmed);
    if (manualPrice) {
      updates.isFree = manualPrice.isFree ?? null;
      updates.priceAmount = manualPrice.priceAmount ?? null;
      updates.priceCurrency = manualPrice.priceCurrency ?? null;
    }
  }

  if (trimmed.length > 140 && !updates.descriptionLong) {
    updates.descriptionLong = trimmed;
  }

  if (options.expectedField === "locationName" && !updates.locationName) {
    const genericLocation = effectiveMessage.match(/\b(?:v|ve|na|in|at)\s+(.+)/i);
    if (genericLocation?.[1]) {
      updates.locationName = cleanLocationValue(genericLocation[1]);
    }
  }

  return updates;
}





