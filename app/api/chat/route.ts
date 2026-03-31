import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { EventCategory, EventStatus, Prisma } from "@prisma/client";
import { extractEventFields } from "@/lib/chat/extractors";
import { generateEventDraftReply } from "@/lib/openaiAi";
import { normalizeForMatch } from "@/lib/chat/normalize";
import {
  getMissingFields,
  getNextQuestion,
  getQuestionForField,
  parseRequestedField,
  getFieldLabel,
  FINAL_CONFIRMATION_PROMPT,
  type DraftField,
  type EventDraft,
  type ChatLanguage,
} from "@/lib/chat/questionEngine";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type ChatRequest = {
  eventId?: string;
  messages?: ChatMessage[];
  language?: string;
  mode?: "ai" | "standard";
};

const isEventStatus = (value: unknown): value is EventStatus =>
  value === "DRAFT" || value === "PUBLISHED";

const isEventCategory = (value: unknown): value is EventCategory =>
  value === "CONFERENCE" ||
  value === "PROMO" ||
  value === "INTERNAL" ||
  value === "OTHER";

const toEventUpdateData = (
  updates: Partial<EventDraft>
): Prisma.EventUpdateInput => {
  const data: Prisma.EventUpdateInput = {};

  if (updates.title !== undefined) data.title = updates.title;
  if (isEventCategory(updates.category)) {
    data.category = updates.category;
  }
  if (isEventStatus(updates.status)) data.status = updates.status;
  if (updates.startDateTime !== undefined) {
    data.startDateTime = updates.startDateTime;
  }
  if (updates.endDateTime !== undefined) data.endDateTime = updates.endDateTime;
  if (updates.timezone !== undefined) data.timezone = updates.timezone;
  if (updates.locationName !== undefined) data.locationName = updates.locationName;
  if (updates.address !== undefined) data.address = updates.address;
  if (updates.city !== undefined) data.city = updates.city;
  if (updates.country !== undefined) data.country = updates.country;
  if (updates.descriptionShort !== undefined) {
    data.descriptionShort = updates.descriptionShort;
  }
  if (updates.descriptionLong !== undefined) {
    data.descriptionLong = updates.descriptionLong;
  }
  if (updates.audience !== undefined) data.audience = updates.audience;
  if (updates.priceAmount !== undefined) data.priceAmount = updates.priceAmount;
  if (updates.priceCurrency !== undefined) data.priceCurrency = updates.priceCurrency;
  if (typeof updates.isFree === "boolean") data.isFree = updates.isFree;
  if (updates.registrationUrl !== undefined) {
    data.registrationUrl = updates.registrationUrl;
  }
  if (updates.organizerName !== undefined) data.organizerName = updates.organizerName;
  if (updates.organizerEmail !== undefined) {
    data.organizerEmail = updates.organizerEmail;
  }
  if (updates.tags !== undefined) data.tags = updates.tags as Prisma.InputJsonValue;

  return data;
};

const normalizeDecisionAnswer = (message: string) =>
  normalizeForMatch(message)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const yesAnswers = new Set([
  "ano",
  "ano prosim",
  "jo",
  "jasne",
  "jiste",
  "potvrzuji",
  "potvrdit",
  "publikuj",
  "yes",
  "y",
  "yes please",
  "sure",
  "ok",
  "okay",
  "go ahead",
  "confirm",
  "publish",
  "publish it",
  "done",
  "hotovo",
]);

type TranslationMap = Record<string, Record<string, unknown>>;

const noAnswers = new Set([
  "ne",
  "n",
  "ne diky",
  "ne dekuji",
  "nechci",
  "nepotvrzuji",
  "nepublikovat",
  "upravit",
  "zmenit",
  "no",
  "no thanks",
  "not now",
  "dont publish",
  "don t publish",
  "do not publish",
  "edit",
]);

const isYesAnswer = (message: string) => {
  const normalized = normalizeDecisionAnswer(message);
  return yesAnswers.has(normalized);
};

const isNoAnswer = (message: string) => {
  const normalized = normalizeDecisionAnswer(message);
  return noAnswers.has(normalized);
};

const isFinalConfirmationPrompt = (message?: string) =>
  Object.values(FINAL_CONFIRMATION_PROMPT).some((prompt) =>
    (message ?? "").includes(prompt)
  );

const AI_INTRO_PROMPT: Record<ChatLanguage, string> = {
  cs: "O jakou akci se jedná?",
  en: "What kind of event is it?",
};

const getLastAssistantMessage = (messages?: ChatMessage[]) => {
  if (!messages) {
    return undefined;
  }

  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === "assistant") {
      return messages[i]?.content;
    }
  }

  return undefined;
};

const formatDateTime = (value: Date | string | null | undefined) => {
  if (!value) {
    return "-";
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleString();
};

const formatText = (value: string | null | undefined) => {
  const trimmed = (value ?? "").trim();
  return trimmed || "-";
};

const offTopicPatterns = [
  /\b\d+\s*[\+\-\*\/]\s*\d+\b/,
  /\b(spocitej|vypocitej|kolik je|calculate|compute)\b/i,
  /\b(pocasi|predpoved|weather|forecast)\b/i,
  /\b(kolik je hodin|what time is it|current time)\b/i,
  /\b(kdo je prezident|who is the president|capital of)\b/i,
];

const isClearlyOffTopic = (message: string) => {
  const normalized = message.trim();
  if (!normalized) {
    return false;
  }
  return offTopicPatterns.some((pattern) => pattern.test(normalized));
};

const buildOffTopicReply = (
  language: ChatLanguage,
  missing: DraftField[]
) => {
  const nextField = missing[0];
  if (!nextField) {
    return language === "en"
      ? "I can help only with event drafting in this chat. What would you like to update in the event?"
      : "V tomto chatu pomaham pouze s pripravenim akce. Co chcete na akci upravit?";
  }

  const nextQuestion = getQuestionForField(nextField, language);
  const remaining = missing
    .slice(1)
    .map((field) => getFieldLabel(field, language))
    .join(", ");

  if (language === "en") {
    const reminder = remaining
      ? ` Then we will complete: ${remaining}.`
      : "";
    return `I can help only with preparing this event, so I cannot answer unrelated requests here. ${nextQuestion}${reminder}`;
  }

  const reminder = remaining ? ` Potom doplníme i: ${remaining}.` : "";
  return `V tomto chatu řešíme jen přípravu akce, proto tady nereaguji na nesouvisející dotazy. ${nextQuestion}${reminder}`;
};

const buildSummaryReply = (
  draft: {
    title?: string | null;
    startDateTime?: Date | string | null;
    endDateTime?: Date | string | null;
    descriptionLong?: string | null;
    descriptionShort?: string | null;
    locationName?: string | null;
  },
  language: ChatLanguage
) => {
  const labels =
    language === "en"
      ? {
          heading: "Summary",
          title: "Title",
          start: "Start",
          end: "End",
          description: "Description",
          short: "Short summary",
          location: "Location",
        }
      : {
          heading: "Shrnuti",
          title: "Nazev akce",
          start: "Zacatek",
          end: "Konec",
          description: "Popis",
          short: "Anotace",
          location: "Misto",
        };

  const lines = [
    `${labels.heading}:`,
    `- ${labels.title}: ${formatText(draft.title)}`,
    `- ${labels.start}: ${formatDateTime(draft.startDateTime)}`,
    `- ${labels.end}: ${formatDateTime(draft.endDateTime)}`,
    `- ${labels.description}: ${formatText(draft.descriptionLong)}`,
    `- ${labels.short}: ${formatText(draft.descriptionShort)}`,
    `- ${labels.location}: ${formatText(draft.locationName)}`,
    "",
    FINAL_CONFIRMATION_PROMPT[language],
  ];

  return lines.join("\n");
};

const buildHelpOffer = (missing: DraftField[], language: ChatLanguage) => {
  if (missing.length === 0) {
    return "";
  }
  const labels = missing.map((field) => getFieldLabel(field, language)).join(", ");

  if (language === "en") {
    return `\n\nI can help you finish this quickly. We still need: ${labels}. Tell me which one you want to do first, or I can suggest all of them step by step.`;
  }

  return `\n\nRád s tím pomůžu a vezmeme to rychle. Ještě potřebujeme: ${labels}. Napiš, čím chceš začít, nebo ti navrhnu vše krok za krokem.`;
};

const userRequiredFields: DraftField[] = [
  "startDateTime",
  "endDateTime",
  "locationName",
];

const buildFirstInputDecisionReply = (
  missing: DraftField[],
  language: ChatLanguage
) => {
  if (missing.length === 0) {
    return FINAL_CONFIRMATION_PROMPT[language];
  }

  const mustProvide = missing.filter((field) => userRequiredFields.includes(field));
  const canGenerate = missing.filter((field) => !userRequiredFields.includes(field));

  const mustProvideLabels = mustProvide
    .map((field) => getFieldLabel(field, language))
    .join(", ");
  const canGenerateLabels = canGenerate
    .map((field) => getFieldLabel(field, language))
    .join(", ");

  if (language === "en") {
    if (canGenerate.length === 0) {
      return `Great, next I need these details directly from you: ${mustProvideLabels}. Please send them and I will continue.`;
    }
    if (mustProvide.length === 0) {
      return `Great start. For the remaining fields (${canGenerateLabels}), do you want to fill them in yourself, or should I generate a first draft?`;
    }
    return `Great start. You still need to provide these details directly: ${mustProvideLabels}. For the remaining fields (${canGenerateLabels}), do you want to fill them in yourself, or should I generate a first draft?`;
  }

  if (canGenerate.length === 0) {
      return `Super, teď od vás potřebuji doplnit tyto údaje: ${mustProvideLabels}. Jakmile je pošlete, navážu dál.`;
  }
  if (mustProvide.length === 0) {
    return `Super start. U zbylých polí (${canGenerateLabels}) chcete údaje doplnit sám/sama, nebo je mám v první verzi vygenerovat?`;
  }
  return `Super start. Tyto údaje potřebuji přímo od vás: ${mustProvideLabels}. U zbylých polí (${canGenerateLabels}) chcete údaje doplnit sám/sama, nebo je mám v první verzi vygenerovat?`;
};

const validateDateTimes = (
  candidate: {
  startDateTime?: Date | string | null;
  endDateTime?: Date | string | null;
  },
  language: ChatLanguage
) => {
  const now = new Date();
  const start = candidate.startDateTime
    ? new Date(candidate.startDateTime)
    : null;
  const end = candidate.endDateTime ? new Date(candidate.endDateTime) : null;

  if (start && start.getTime() <= now.getTime()) {
    return {
      field: "startDateTime" as const,
      message:
        language === "en"
          ? "Start date/time must be in the future (e.g. Mar 23, 2026 at 5pm)."
          : "Datum a čas začátku musí být v budoucnosti (např. 23.3.2026 v 17h).",
    };
  }

  if (end && end.getTime() <= now.getTime()) {
    return {
      field: "endDateTime" as const,
      message:
        language === "en"
          ? "End date/time must be in the future (e.g. Mar 23, 2026 at 7pm)."
          : "Datum a čas konce musí být v budoucnosti (např. 23.3.2026 v 19h).",
    };
  }

  if (start && end && end.getTime() <= start.getTime()) {
    return {
      field: "endDateTime" as const,
      message:
        language === "en"
          ? "End must be after the start."
          : "Konec akce musí být později než začátek akce.",
    };
  }

  return null;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatRequest;
    const latest = body.messages?.[body.messages.length - 1]?.content ?? "";
    const lastAssistantMessage = getLastAssistantMessage(body.messages);
    const userMessageCount = (body.messages ?? []).filter(
      (message) => message.role === "user"
    ).length;
    const mode = body.mode === "ai" ? "ai" : "standard";

    const eventId = body.eventId;
    const language = (typeof body.language === "string"
      ? body.language.toLowerCase()
      : "cs") as ChatLanguage;
    const existingDraft = eventId
      ? await prisma.event.findUnique({ where: { id: eventId } })
      : await prisma.event.findFirst({
          where: { status: "DRAFT" },
          orderBy: { updatedAt: "desc" },
        });

    const draft =
      existingDraft ??
      (await prisma.event.create({
        data: { status: "DRAFT", tags: [] },
      }));

    const translations =
      draft && typeof draft.translations === "object" && draft.translations
        ? (draft.translations as TranslationMap)
        : {};
    const localized =
      language !== "cs" && translations[language]
        ? { ...draft, ...translations[language] }
        : draft;

    const missingBefore = getMissingFields(localized);

    if (missingBefore.length === 0 && isFinalConfirmationPrompt(lastAssistantMessage)) {
      if (isYesAnswer(latest)) {
        const publishedDraft =
          draft.status === "PUBLISHED"
            ? draft
            : await prisma.event.update({
                where: { id: draft.id },
                data: { status: "PUBLISHED" },
              });

        return NextResponse.json({
          reply:
            language === "en"
              ? "Thank you. The event is saved and the conversation is complete."
              : "Děkuji. Událost je uložena a konverzace je ukončena.",
          draft: publishedDraft,
          missing: [],
        });
      }

      if (isNoAnswer(latest)) {
        return NextResponse.json({
          reply:
            language === "en"
              ? "Great. Tell me directly what you want to adjust, and I will update it."
              : "Skvělé. Napište rovnou, co chcete upravit, a hned to změním.",
          draft,
          missing: [],
        });
      }
    }

    if (latest && missingBefore.length > 0 && isClearlyOffTopic(latest)) {
      return NextResponse.json({
        reply: buildOffTopicReply(language, missingBefore),
        draft,
        missing: missingBefore,
      });
    }

    if (mode === "ai") {
      if (!latest) {
        return NextResponse.json({
          reply: AI_INTRO_PROMPT[language],
          draft,
          missing: missingBefore,
        });
      }

      const expectedField =
        missingBefore[0] ??
        parseRequestedField(latest) ??
        (missingBefore.length > 0
          ? parseRequestedField(lastAssistantMessage ?? "")
          : undefined) ??
        undefined;
      const userDerivedUpdates = extractEventFields(latest, {
        expectedField,
        referenceDateTime: localized.startDateTime ?? localized.endDateTime,
        existingTitle:
          typeof localized.title === "string" ? localized.title : undefined,
        language,
      });
      const explicitRequestedField = parseRequestedField(latest);
      const allowEnglishTitleUpdate =
        expectedField === "title" || explicitRequestedField === "title";
      if (language !== "cs" && !allowEnglishTitleUpdate) {
        delete userDerivedUpdates.title;
      }
      let aiReply = "";
      let updates: Partial<EventDraft> = {};

      if (userMessageCount === 1) {
        updates = { ...userDerivedUpdates };
      } else {
        const aiResponse = await generateEventDraftReply({
          messages: body.messages ?? [],
          draft: localized,
          missing: missingBefore,
          language,
        });
        aiReply = aiResponse.reply ?? "";
        updates = {
          ...(aiResponse.updates ?? {}),
          ...userDerivedUpdates,
        };
      }

      if (language !== "cs" && !allowEnglishTitleUpdate) {
        delete updates.title;
      }

      if (!("startDateTime" in userDerivedUpdates)) {
        delete updates.startDateTime;
      }
      if (!("endDateTime" in userDerivedUpdates)) {
        delete updates.endDateTime;
      }
      if (!("locationName" in userDerivedUpdates)) {
        delete updates.locationName;
      }

      const candidate = {
        ...localized,
        ...updates,
        tags: updates.tags ?? localized.tags,
        isFree: updates.isFree ?? localized.isFree,
      };

      const dateValidationError = validateDateTimes(candidate, language);
      if (dateValidationError) {
        const missing = Array.from(
          new Set([...getMissingFields(candidate), dateValidationError.field])
        );
        return NextResponse.json({
          reply: `${dateValidationError.message} ${getQuestionForField(
            dateValidationError.field,
            language
          )}`,
          draft,
          missing,
        });
      }

      const missingAfter = getMissingFields(candidate);
      const updateData = toEventUpdateData(updates);

      let updatedDraft = draft;
      if (Object.keys(updateData).length > 0) {
        if (language === "cs") {
          updatedDraft = await prisma.event.update({
            where: { id: draft.id },
            data: updateData,
          });
        } else {
          const translatableKeys = [
            "title",
            "descriptionShort",
            "descriptionLong",
            "audience",
            "organizerName",
            "tags",
          ] as const;
          const languagePayload: Record<string, unknown> = {
            ...(translations[language] ?? {}),
          };
          const updateDataRecord = updateData as unknown as Record<string, unknown>;
          translatableKeys.forEach((key) => {
            if (key in updateData) {
              languagePayload[key] = updateDataRecord[key];
              delete updateDataRecord[key];
            }
          });
          const data: Prisma.EventUpdateInput = {
            ...updateData,
            translations: {
              ...translations,
              [language]: languagePayload,
            } as Prisma.InputJsonValue,
          };
          updatedDraft = await prisma.event.update({
            where: { id: draft.id },
            data,
          });
        }
      }

      let reply = aiReply;
      if (missingAfter.length > 0) {
        if (userMessageCount === 1) {
          reply = buildFirstInputDecisionReply(missingAfter, language);
        } else if (!reply) {
          reply = getNextQuestion(candidate, language).question;
        }
        reply = `${reply}${buildHelpOffer(missingAfter, language)}`;
      } else {
        reply = buildSummaryReply(candidate, language);
      }

      return NextResponse.json({
        reply,
        draft: updatedDraft,
        missing: missingAfter,
      });
    }

    if (!latest) {
      const { question } = getNextQuestion(localized, language);
      return NextResponse.json({
        reply: question,
        draft,
        missing: getMissingFields(localized),
      });
    }

    const expectedField =
      missingBefore[0] ??
      parseRequestedField(latest) ??
      (missingBefore.length > 0
        ? parseRequestedField(lastAssistantMessage ?? "")
        : undefined) ??
      undefined;

    const updates = extractEventFields(latest, {
      expectedField,
      referenceDateTime: localized.startDateTime ?? localized.endDateTime,
      existingTitle:
        typeof localized.title === "string" ? localized.title : undefined,
      language,
    });
    const explicitRequestedField = parseRequestedField(latest);
    const allowEnglishTitleUpdate =
      expectedField === "title" || explicitRequestedField === "title";
    if (language !== "cs" && !allowEnglishTitleUpdate) {
      delete updates.title;
    }

    const candidate = {
      ...localized,
      ...updates,
      tags: updates.tags ?? localized.tags,
      isFree: updates.isFree ?? localized.isFree,
    };

    const dateValidationError = validateDateTimes(candidate, language);
    if (dateValidationError) {
      const missing = Array.from(
        new Set([...getMissingFields(candidate), dateValidationError.field])
      );
      return NextResponse.json({
         reply: `${dateValidationError.message} ${getQuestionForField(
           dateValidationError.field,
           language
         )}`,
        draft,
        missing,
      });
    }

    const missingAfter = getMissingFields(candidate);

    const updateData = toEventUpdateData(updates);

    let updatedDraft = draft;
    if (Object.keys(updateData).length > 0) {
      if (language === "cs") {
        updatedDraft = await prisma.event.update({
          where: { id: draft.id },
          data: updateData,
        });
      } else {
        const translatableKeys = [
          "title",
          "descriptionShort",
          "descriptionLong",
          "audience",
          "organizerName",
          "tags",
        ] as const;
        const languagePayload: Record<string, unknown> = {
          ...(translations[language] ?? {}),
        };
        const updateDataRecord = updateData as unknown as Record<string, unknown>;
        translatableKeys.forEach((key) => {
          if (key in updateData) {
            languagePayload[key] = updateDataRecord[key];
            delete updateDataRecord[key];
          }
        });
        const data: Prisma.EventUpdateInput = {
          ...updateData,
          translations: {
            ...translations,
            [language]: languagePayload,
          } as Prisma.InputJsonValue,
        };
        updatedDraft = await prisma.event.update({
          where: { id: draft.id },
          data,
        });
      }
    }

    const { question } = getNextQuestion(candidate, language);
    const reply =
      missingAfter.length === 0
        ? buildSummaryReply(candidate, language)
        : userMessageCount === 1
        ? buildFirstInputDecisionReply(missingAfter, language)
        : question;

    return NextResponse.json({
      reply,
      draft: updatedDraft,
      missing: missingAfter,
    });
} catch (error) {
  const rawMessage =
    error instanceof Error ? error.message : "Unknown chat error.";
  let detail = rawMessage.replace(/sk-[A-Za-z0-9_-]+/g, "sk-***");
  if (/api key|authentication|unauthorized|invalid api key/i.test(detail)) {
    detail = "Authentication failed. Check OPENAI_API_KEY.";
  }
  console.error("Chat API error:", error);
  return NextResponse.json(
    { error: "Chat služba dočasně není dostupná.", detail },
    { status: 500 }
  );
}
}

export const runtime = "nodejs";

