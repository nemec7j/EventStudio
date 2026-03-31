import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { detectPlaceholders } from "@/lib/templateEngine";
import { storeUpload } from "@/lib/upload";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const allowedExtensions = [".md", ".markdown", ".html", ".htm"];

const getExtension = (fileName: string) =>
  `.${fileName.split(".").pop() ?? ""}`.toLowerCase();

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const name = formData.get("name");

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { error: "Nebyl dodán soubor." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Soubor je příliš velký (max 5 MB)." },
        { status: 400 }
      );
    }

    const extension = getExtension(file.name);
    if (!allowedExtensions.includes(extension)) {
      return NextResponse.json(
        { error: "Podporujeme pouze Markdown nebo HTML soubory." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const content = buffer.toString("utf-8");
    const detectedPlaceholders = detectPlaceholders(content);

    const stored = await storeUpload(file.name, buffer, "templates");
    const template = await prisma.template.create({
      data: {
        name:
          typeof name === "string" && name.trim().length > 0
            ? name.trim()
            : file.name.replace(/\.[^/.]+$/, ""),
        type: extension.startsWith(".md") ? "MD" : "HTML",
        originalFileUrl: stored.publicUrl,
        detectedPlaceholders,
      },
    });

    return NextResponse.json({ template });
  } catch {
    return NextResponse.json(
      { error: "Nahrání šablony se nepodařilo." },
      { status: 500 }
    );
  }
}
