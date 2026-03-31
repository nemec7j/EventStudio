import OpenAI from "openai";
import type { EventDraft } from "@/lib/chat/questionEngine";

type ChatRole = "user" | "assistant" | "system";

type ChatMessage = {
  role: ChatRole;
  content: string;
};

type OpenAiReply = {
  reply: string;
  updates?: Partial<EventDraft>;
};

type GenerateArgs = {
  messages: ChatMessage[];
  draft: EventDraft;
  missing: string[];
  language: "cs" | "en";
};

const allowedUpdateKeys = new Set<keyof EventDraft>([
  "title",
  "category",
  "status",
  "startDateTime",
  "endDateTime",
  "timezone",
  "locationName",
  "address",
  "city",
  "country",
  "descriptionShort",
  "descriptionLong",
  "audience",
  "priceAmount",
  "priceCurrency",
  "isFree",
  "registrationUrl",
  "organizerName",
  "organizerEmail",
  "tags",
]);

const getOpenAiClient = () => {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set.");
  }
  return new OpenAI({ apiKey, timeout: 30000 });
};

const coerceDate = (value: unknown) => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
};

const sanitizeUpdates = (raw?: Record<string, unknown>) => {
  if (!raw) {
    return {};
  }
  const cleaned: Partial<EventDraft> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!allowedUpdateKeys.has(key as keyof EventDraft)) {
      continue;
    }
    if (key === "startDateTime" || key === "endDateTime") {
      const parsed = coerceDate(value);
      if (parsed) {
        cleaned[key] = parsed;
      }
      continue;
    }
    if (key === "priceAmount" && typeof value === "string") {
      const parsed = Number(value.replace(",", "."));
      if (!Number.isNaN(parsed)) {
        cleaned.priceAmount = parsed;
      }
      continue;
    }
    if (key === "isFree") {
      if (typeof value === "boolean") {
        cleaned.isFree = value;
      } else if (typeof value === "string") {
        cleaned.isFree = value.toLowerCase() === "true";
      }
      continue;
    }
    if (key === "tags") {
      if (Array.isArray(value)) {
        cleaned.tags = value.map((item) => String(item));
      }
      continue;
    }
    if (key === "priceAmount") {
      if (typeof value === "number" && !Number.isNaN(value)) {
        cleaned.priceAmount = value;
      }
      continue;
    }
    if (
      key === "title" ||
      key === "category" ||
      key === "status" ||
      key === "timezone" ||
      key === "locationName" ||
      key === "address" ||
      key === "city" ||
      key === "country" ||
      key === "descriptionShort" ||
      key === "descriptionLong" ||
      key === "audience" ||
      key === "priceCurrency" ||
      key === "registrationUrl" ||
      key === "organizerName" ||
      key === "organizerEmail"
    ) {
      if (typeof value === "string") {
        cleaned[key] = value;
      }
    }
  }
  return cleaned;
};

const extractJson = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  const withoutFence = trimmed
    .replace(/^```json/i, "")
    .replace(/^```/i, "")
    .replace(/```$/, "")
    .trim();
  const start = withoutFence.indexOf("{");
  const end = withoutFence.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  try {
    return JSON.parse(withoutFence.slice(start, end + 1));
  } catch {
    return null;
  }
};

const buildPrompt = (args: GenerateArgs) => {
  const history = args.messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
  const hasLongDescription =
    typeof args.draft.descriptionLong === "string" &&
    args.draft.descriptionLong.trim().length > 0;
  const styleInstruction =
    args.language === "cs"
      ? [
          "Piš prirozene, lidsky a neformalnim, ale profesionalnim tonem.",
          "Nevytvarej strojove sablony, nepis nadpisy typu 'Vystup' nebo 'Dalsi krok'.",
          "Pouzij 2 az 4 kratke vety.",
          "Vzdy poloz jen jednu jasnou navazujici otazku, ktera posouva doplneni povinnych poli.",
          "Kdyz uzivatel odboci mimo tvorbu akce, slusne odmitni odbocku a hned vrat konverzaci k dalsimu chybejicimu udaji.",
        ].join(" ")
      : [
          "Write naturally in a human, conversational, professional tone.",
          "Avoid robotic templates and avoid headings like 'Output' or 'Next step'.",
          "Use 2 to 4 short sentences.",
          "Always ask exactly one clear follow-up question that moves required fields forward.",
          "If the user goes off-topic, politely refuse and immediately bring them back to the next missing event detail.",
        ].join(" ");
  const firstDescriptionInstruction =
    args.language === "cs"
      ? hasLongDescription
        ? "Pokud popis uz existuje, pouze ho upresni podle noveho zadani."
        : "Pokud tvoris prvni verzi descriptionLong, napis detailni text v rozsahu aspon 4-6 vet (idealne 450+ znaku): co je to za akci, pro koho je, hlavni body programu, prinos a prakticke informace."
      : hasLongDescription
      ? "If descriptionLong already exists, only refine it based on new input."
      : "If you are creating the first version of descriptionLong, write a detailed text with at least 4-6 sentences (ideally 450+ characters): what the event is, who it is for, key program points, value, and practical details.";
  return `
Language: ${args.language}
Required fields: title, startDateTime, endDateTime, descriptionLong, descriptionShort, locationName.
Current draft: ${JSON.stringify(args.draft)}
Missing fields: ${JSON.stringify(args.missing)}
Conversation: ${JSON.stringify(history)}

Return JSON only in this shape:
{"reply":"...","updates":{...}}

Rules:
- You are an event-drafting assistant. Stay strictly on event drafting tasks.
- Do not solve unrelated tasks (math, weather, trivia, coding, general Q&A).
- Be friendly, but keep control of the flow and guide completion of missing required fields.
- Ask exactly one clear follow-up question.
- If all required fields are present, ask for confirmation that everything is correct.
- Only include updates you are confident about.
- For dates/times, use ISO 8601 if possible.
- Keep replies concise and chat-friendly.
- ${firstDescriptionInstruction}
- ${styleInstruction}
  `;
};

export async function generateEventDraftReply(
  args: GenerateArgs
): Promise<OpenAiReply> {
  const client = getOpenAiClient();
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const response = await client.responses.create({
    model,
    input: buildPrompt(args),
    temperature: 0.3,
    max_output_tokens: 600,
  });

  const text = response.output_text ?? "";
  const payload = extractJson(text);
  const reply = typeof payload?.reply === "string" ? payload.reply : "";
  const rawUpdates =
    payload &&
    typeof payload === "object" &&
    "updates" in payload &&
    payload.updates &&
    typeof payload.updates === "object"
      ? (payload.updates as Record<string, unknown>)
      : undefined;
  const updates = sanitizeUpdates(
    rawUpdates
  );

  return { reply, updates };
}
