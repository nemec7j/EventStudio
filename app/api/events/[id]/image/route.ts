import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAbsolutePath, storeUpload, stripPublicUrl } from "@/lib/upload";
import { promises as fs } from "fs";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const allowedExtensions = [".png", ".jpg", ".jpeg", ".webp", ".gif"];

const getExtension = (fileName: string) =>
  `.${fileName.split(".").pop() ?? ""}`.toLowerCase();

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "Nebyl dodán soubor." }, { status: 400 });
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
        { error: "Podporujeme pouze obrázky PNG/JPG/WEBP/GIF." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const stored = await storeUpload(file.name, buffer, "assets");

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      return NextResponse.json({ error: "Událost nenalezena." }, { status: 404 });
    }

    const existingAssets = Array.isArray(event.assets) ? event.assets : [];
    const nextAssets = [
      ...existingAssets,
      { name: file.name, url: stored.publicUrl, kind: "image" },
    ];

    const updated = await prisma.event.update({
      where: { id },
      data: { assets: nextAssets },
    });

    return NextResponse.json({ event: updated, imageUrl: stored.publicUrl });
  } catch {
    return NextResponse.json(
      { error: "Nahrání obrázku se nepodařilo." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;

  try {
    const body = (await request.json()) as { url?: string };
    if (!body?.url) {
      return NextResponse.json(
        { error: "Chybí url obrázku." },
        { status: 400 }
      );
    }

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      return NextResponse.json({ error: "Událost nenalezena." }, { status: 404 });
    }

    const existingAssets = Array.isArray(event.assets) ? event.assets : [];
    const nextAssets = existingAssets.filter((asset) => {
      if (!asset || typeof asset !== "object" || !("url" in asset)) {
        return true;
      }
      return (asset as { url?: string }).url !== body.url;
    });

    const relativePath = stripPublicUrl(body.url);
    if (relativePath) {
      try {
        await fs.unlink(getAbsolutePath(relativePath));
      } catch {
        // ignore missing files
      }
    }

    const updated = await prisma.event.update({
      where: { id },
      data: { assets: nextAssets },
    });

    return NextResponse.json({ event: updated });
  } catch {
    return NextResponse.json(
      { error: "Smazání obrázku se nepodařilo." },
      { status: 500 }
    );
  }
}
