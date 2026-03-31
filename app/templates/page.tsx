"use client";

import Navbar from "@/components/Navbar";
import TemplateManager from "@/components/TemplateManager";
import { useLanguage } from "@/components/LanguageProvider";
import { t } from "@/lib/i18n";

export default function TemplatesPage() {
  const { dictionary } = useLanguage();
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f8fafc,#e0e7ff_45%,#f1f5f9_75%)] text-slate-900">
      <Navbar />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 pb-16 pt-10">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            {t(dictionary, "templates_header")}
          </p>
          <h1 className="mt-3 text-3xl font-semibold">
            {t(dictionary, "templates_title")}
          </h1>
          <p className="mt-2 text-slate-500">
            {t(dictionary, "templates_subtitle")}
          </p>
        </header>
        <TemplateManager />
      </main>
    </div>
  );
}
