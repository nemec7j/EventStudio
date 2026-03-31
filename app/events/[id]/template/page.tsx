import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import TemplatePreviewActions from "@/components/TemplatePreviewActions";
import { prisma } from "@/lib/prisma";
import { fillTemplateContent } from "@/lib/templateEngine";
import { mktTemplateHtml } from "@/lib/templates/mktTemplate";
import { buildTemplateVariables } from "@/lib/templateVariables";
import { cookies } from "next/headers";
import { getTranslations, t } from "@/lib/i18n";

type EventTemplatePageProps = {
  params: Promise<{
    id: string;
  }>;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

export default async function EventTemplatePage({
  params,
}: EventTemplatePageProps) {
  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id } });

  if (!event) {
    notFound();
  }

  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value ?? "cs";
  const dictionary = getTranslations(lang);
  const variablesBase = buildTemplateVariables(event, { language: lang });
  const headerList = await headers();
  const host = headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  const origin = host ? `${proto}://${host}` : null;
  const variables =
    origin && variablesBase.image_url?.startsWith("/")
      ? { ...variablesBase, image_url: `${origin}${variablesBase.image_url}` }
      : variablesBase;
  const filledHtml = fillTemplateContent(mktTemplateHtml, variables);
  const fileName = `${slugify(event.title ?? "event") || "event"}-${event.id}.html`;
  const downloadHref = `data:text/html;charset=utf-8,${encodeURIComponent(filledHtml)}`;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f8fafc,#e0e7ff_45%,#f1f5f9_75%)] text-slate-900">
      <Navbar />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 pb-16 pt-10">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            {t(dictionary, "template_preview_label")}
          </p>
          <h1 className="mt-3 text-3xl font-semibold">
            {t(dictionary, "template_preview_title")}
          </h1>
          <p className="mt-2 text-slate-500">
            {t(dictionary, "template_preview_subtitle", {
              title: event.title ?? event.id,
            })}
          </p>
          <TemplatePreviewActions
            eventId={event.id}
            downloadHref={downloadHref}
            fileName={fileName}
            backLabel={t(dictionary, "template_back")}
            downloadLabel={t(dictionary, "template_download")}
            exportPdfLabel={t(dictionary, "template_export_pdf")}
            html={filledHtml}
          />
        </header>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <iframe
              title={t(dictionary, "template_preview_frame")}
              srcDoc={filledHtml}
              className="h-[900px] w-full border-0"
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
