import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { eventCreateSchema } from "@/lib/schemas/event";
import { Prisma } from "@prisma/client";

export async function GET() {
  try {
    const events = await prisma.event.findMany({
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ events }, { status: 200 });
  } catch (error) {
    console.error("GET /api/events failed:", error);
    return NextResponse.json(
      { error: "Nepodařilo se načíst události." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Handle empty / non-JSON bodies gracefully
    const raw = await request.text();
    const body = raw ? JSON.parse(raw) : {};

    const parsed = eventCreateSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Neplatná data.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const event = await prisma.event.create({
      data: {
        title: data.title ?? null,
        category: data.category ?? null,
        status: data.status ?? "DRAFT",
        startDateTime: data.startDateTime ? new Date(data.startDateTime) : null,
        endDateTime: data.endDateTime ? new Date(data.endDateTime) : null,
        timezone: data.timezone ?? null,
        locationName: data.locationName ?? null,
        address: data.address ?? null,
        city: data.city ?? null,
        country: data.country ?? null,
        descriptionShort: data.descriptionShort ?? null,
        descriptionLong: data.descriptionLong ?? null,
        audience: data.audience ?? null,
        priceAmount: data.priceAmount ?? null,
        priceCurrency: data.priceCurrency ?? null,
        isFree: data.isFree ?? false,
        registrationUrl: data.registrationUrl ?? null,
        organizerName: data.organizerName ?? null,
        organizerEmail: data.organizerEmail ?? null,

        // SQLite schema: tags is Json? (not String[])
        // Store as JSON array when provided; otherwise null or [] depending on your preference.
        tags: Array.isArray(data.tags)
          ? (data.tags as Prisma.InputJsonValue)
          : undefined,

        // assets is Json? in your schema
        assets: data.assets as Prisma.InputJsonValue | undefined,
        translations: data.translations as Prisma.InputJsonValue | undefined,
      },
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    console.error("POST /api/events failed:", error);

    // Always return JSON so the client doesn't crash on response.json()
    return NextResponse.json(
      { error: "Nepodařilo se vytvořit událost." },
      { status: 500 }
    );
  }
}
