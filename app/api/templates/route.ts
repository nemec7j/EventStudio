import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const templates = await prisma.template.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      generatedMaterials: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return NextResponse.json({ templates });
}
