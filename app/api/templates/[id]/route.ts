import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAbsolutePath, stripPublicUrl } from "@/lib/upload";
import { promises as fs } from "fs";

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

export const runtime = "nodejs";

const removeFile = async (publicUrl?: string | null) => {
  if (!publicUrl) {
    return;
  }
  const relativePath = stripPublicUrl(publicUrl);
  if (!relativePath) {
    return;
  }
  try {
    await fs.unlink(getAbsolutePath(relativePath));
  } catch {
    // Ignore missing files.
  }
};

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  const template = await prisma.template.findUnique({
    where: { id },
    include: { generatedMaterials: true },
  });

  if (!template) {
    return NextResponse.json({ error: "Šablona nenalezena." }, { status: 404 });
  }

  await Promise.all([
    removeFile(template.originalFileUrl),
    ...(template.generatedMaterials ?? []).map((material) =>
      removeFile(material.outputFileUrl)
    ),
  ]);

  await prisma.template.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
