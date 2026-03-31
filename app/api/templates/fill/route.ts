import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fillTemplateContent } from "@/lib/templateEngine";
import { buildTemplateVariables } from "@/lib/templateVariables";
import { getAbsolutePath, storeUpload, stripPublicUrl } from "@/lib/upload";
import { promises as fs } from "fs";

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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      templateId?: string;
      eventId?: string;
      language?: string;
    };

    if (!body?.templateId || !body?.eventId) {
      return NextResponse.json(
        { error: "Chybí templateId nebo eventId." },
        { status: 400 }
      );
    }

    const [template, event] = await Promise.all([
      prisma.template.findUnique({ where: { id: body.templateId } }),
      prisma.event.findUnique({ where: { id: body.eventId } }),
    ]);

    if (!template || !event) {
      return NextResponse.json(
        { error: "Šablona nebo událost nenalezena." },
        { status: 404 }
      );
    }

    const relativePath = stripPublicUrl(template.originalFileUrl);
    const filePath = getAbsolutePath(relativePath);
    const content = await fs.readFile(filePath, "utf-8");

    const language =
      typeof body.language === "string" ? body.language.toLowerCase() : "cs";
    let variables = buildTemplateVariables(event, { language });
    if (variables.image_url && variables.image_url.startsWith("/")) {
      const origin = new URL(request.url).origin;
      variables = {
        ...variables,
        image_url: `${origin}${variables.image_url}`,
      };
    }

    const extension = template.type === "MD" ? "md" : "html";
    const safeLanguage = ["cs", "en", "de", "pl"].includes(language)
      ? language
      : "cs";

    if (safeLanguage !== "cs") {
      const apiKey = process.env.DEEPL_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { error: "Chybí DEEPL_API_KEY pro překlad." },
          { status: 500 }
        );
      }

      const targetLang =
        safeLanguage === "en"
          ? "EN"
          : safeLanguage === "de"
          ? "DE"
          : "PL";

      const translatableKeys = [
        "title",
        "description_short",
        "description_long",
        "organizer_name",
        "audience",
        "tags",
        "nazev_akce",
        "anotace",
        "popis",
      ] as const;

      const sourceTexts = translatableKeys
        .map((key) => variables[key])
        .filter(
          (value): value is string => typeof value === "string" && value.length > 0
        );

      const translations = await translateTexts(sourceTexts, targetLang, apiKey);
      let cursor = 0;
      const translatedVariables = { ...variables };

      translatableKeys.forEach((key) => {
        const value = variables[key];
        if (typeof value === "string" && value.length > 0) {
          translatedVariables[key] = translations[cursor] ?? value;
          cursor += 1;
        }
      });

      variables = translatedVariables;
    }
    const filled = fillTemplateContent(content, variables);
    const outputName = `${template.name
      .toLowerCase()
      .replace(/\s+/g, "-")}-${event.id}-${safeLanguage}.${extension}`;

    const stored = await storeUpload(outputName, Buffer.from(filled), "generated");
    const generated = await prisma.generatedMaterial.create({
      data: {
        templateId: template.id,
        eventId: event.id,
        outputFileUrl: stored.publicUrl,
      },
    });

    return NextResponse.json({
      output: generated,
      preview: filled.slice(0, 500),
    });
  } catch {
    return NextResponse.json(
      { error: "Generování výstupu se nepodařilo." },
      { status: 500 }
    );
  }
}
