import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";

const resolveDeepLBaseUrl = (apiKey: string) =>
  apiKey.endsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com";

const translateTexts = async (
  texts: string[],
  targetLang: string,
  apiKey: string
) => {
  if (texts.length === 0) {
    return [];
  }
  const params = new URLSearchParams();
  texts.forEach((text) => params.append("text", text));
  params.append("target_lang", targetLang);

  const response = await fetch(`${resolveDeepLBaseUrl(apiKey)}/v2/translate`, {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${apiKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error("Translation failed");
  }

  const payload = (await response.json()) as {
    translations?: Array<{ text: string }>;
  };

  return (payload.translations ?? []).map((item) => item.text);
};

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;

  try {
    const body = (await request.json()) as { language?: string };
    const language =
      typeof body.language === "string" ? body.language.toLowerCase() : "cs";

    if (language === "cs") {
      return NextResponse.json(
        { error: "Čeština se nepřekládá." },
        { status: 400 }
      );
    }

    const apiKey = process.env.DEEPL_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Chybí DEEPL_API_KEY pro překlad." },
        { status: 500 }
      );
    }

    const targetLang =
      language === "en" ? "EN" : language === "de" ? "DE" : "PL";

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      return NextResponse.json({ error: "Událost nenalezena." }, { status: 404 });
    }

    const translatable = {
      title: event.title ?? "",
      descriptionShort: event.descriptionShort ?? "",
      descriptionLong: event.descriptionLong ?? "",
      audience: event.audience ?? "",
      organizerName: event.organizerName ?? "",
      tags: Array.isArray(event.tags)
        ? event.tags.map((tag) => String(tag)).join(", ")
        : "",
    };

    const keys = Object.keys(translatable) as Array<keyof typeof translatable>;
    const sourceTexts = keys.map((key) => translatable[key]).filter(Boolean);

    const translations = await translateTexts(sourceTexts, targetLang, apiKey);
    let cursor = 0;
    const translatedPayload: Record<string, string> = {};
    keys.forEach((key) => {
      const value = translatable[key];
      if (value && value.length > 0) {
        translatedPayload[key] = translations[cursor] ?? value;
        cursor += 1;
      }
    });

    const existingTranslations =
      event && typeof event.translations === "object" && event.translations
        ? (event.translations as Record<string, unknown>)
        : {};

    const updated = await prisma.event.update({
      where: { id },
      data: {
        translations: {
          ...existingTranslations,
          [language]: {
            ...(existingTranslations[language] ?? {}),
            ...translatedPayload,
          },
        } as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ event: updated });
  } catch {
    return NextResponse.json(
      { error: "Překlad se nepodařilo vytvořit." },
      { status: 500 }
    );
  }
}
