"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/LanguageProvider";
import { t } from "@/lib/i18n";

const navItems = [
  { key: "nav_dashboard", href: "/" },
  { key: "nav_templates", href: "/templates" },
];

export default function Navbar() {
  const { language, setLanguage, dictionary } = useLanguage();

  return (
    <header className="border-b border-slate-200/70 bg-white/70 backdrop-blur">
      <div className="flex w-full flex-col gap-4 py-5 pr-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 pl-2">
          <Image
            src="/orea-logo.png"
            alt="OREA Hotels & Resorts"
            width={140}
            height={40}
            className="h-10 w-auto"
            priority
          />
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              {t(dictionary, "app_subtitle")}
            </p>
            <h1 className="text-xl font-semibold text-slate-900">
              {t(dictionary, "app_title")}
            </h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <nav className="flex flex-wrap items-center gap-3">
            {navItems.map((item) => (
              <Button key={item.href} asChild variant="outline" size="sm">
                <Link href={item.href}>
                  {t(dictionary, item.key as keyof typeof dictionary)}
                </Link>
              </Button>
            ))}
          </nav>
          <label className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
            {t(dictionary, "language")}
            <select
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-900 shadow-sm"
              value={language}
              onChange={(event) => setLanguage(event.target.value as "cs" | "en")}
              aria-label={t(dictionary, "language")}
            >
              <option value="cs">CS</option>
              <option value="en">EN</option>
            </select>
          </label>
        </div>
      </div>
    </header>
  );
}
