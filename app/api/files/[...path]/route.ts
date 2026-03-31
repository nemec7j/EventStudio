import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getAbsolutePath } from "@/lib/upload";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{
    path: string[];
  }>;
};

const getContentType = (filePath: string) => {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".html" || ext === ".htm") {
    return "text/html; charset=utf-8";
  }
  if (ext === ".md" || ext === ".markdown") {
    return "text/markdown; charset=utf-8";
  }
  if (ext === ".png") {
    return "image/png";
  }
  if (ext === ".jpg" || ext === ".jpeg") {
    return "image/jpeg";
  }
  if (ext === ".webp") {
    return "image/webp";
  }
  if (ext === ".gif") {
    return "image/gif";
  }
  return "application/octet-stream";
};

const shouldInline = (contentType: string) =>
  contentType.startsWith("image/");

export async function GET(_request: Request, { params }: RouteParams) {
  const { path: rawPath } = await params;
  const segments = rawPath ?? [];

  if (segments.some((segment) => segment.includes(".."))) {
    return NextResponse.json({ error: "Neplatná cesta." }, { status: 400 });
  }

  const relativePath = segments.join("/");
  const filePath = getAbsolutePath(relativePath);

  try {
    const fileBuffer = await fs.readFile(filePath);
    const fileName = path.basename(filePath);
    const contentType = getContentType(filePath);
    const disposition = shouldInline(contentType) ? "inline" : "attachment";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `${disposition}; filename=\"${fileName}\"`,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Soubor nebyl nalezen." },
      { status: 404 }
    );
  }
}
