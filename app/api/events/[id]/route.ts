import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { eventUpdateSchema } from "@/lib/schemas/event";
import { Prisma } from "@prisma/client";

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  const event = await prisma.event.findUnique({
    where: { id },
  });

  if (!event) {
    return NextResponse.json({ error: "Událost nenalezena." }, { status: 404 });
  }

  return NextResponse.json({ event });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = eventUpdateSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Neplatná data.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const event = await prisma.event.update({
      where: { id },
      data: {
        title: data.title,
        category: data.category,
        status: data.status,
        startDateTime: data.startDateTime
          ? new Date(data.startDateTime)
          : undefined,
        endDateTime: data.endDateTime ? new Date(data.endDateTime) : undefined,
        timezone: data.timezone,
        locationName: data.locationName,
        address: data.address,
        city: data.city,
        country: data.country,
        descriptionShort: data.descriptionShort,
        descriptionLong: data.descriptionLong,
        audience: data.audience,
        priceAmount: data.priceAmount ?? undefined,
        priceCurrency: data.priceCurrency ?? undefined,
        isFree: data.isFree ?? undefined,
        registrationUrl: data.registrationUrl,
        organizerName: data.organizerName,
        organizerEmail: data.organizerEmail,
        tags: data.tags ?? undefined,
        assets: data.assets ?? undefined,
        translations: data.translations as Prisma.InputJsonValue | undefined,
      },
    });

    return NextResponse.json({ event });
  } catch {
    return NextResponse.json(
      { error: "Nepodařilo se uložit změny." },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  try {
    await prisma.event.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Událost se nepodařilo smazat." },
      { status: 500 }
    );
  }
}
