"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useLanguage } from "@/components/LanguageProvider";
import { t } from "@/lib/i18n";

type FileUploadProps = {
  title?: string;
  description?: string;
  onUpload?: (file: File) => void;
  disabled?: boolean;
};

export default function FileUpload({
  title,
  description,
  onUpload,
  disabled = false,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const { dictionary } = useLanguage();
  const resolvedTitle = title ?? t(dictionary, "upload_title");
  const resolvedDescription = description ?? t(dictionary, "upload_description");
  const fileLabel = t(dictionary, "file_choose");
  const fileEmpty = t(dictionary, "file_none");

  return (
    <Card>
      <CardHeader>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
          {t(dictionary, "upload_label")}
        </p>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">
          {resolvedTitle}
        </h2>
        <p className="mt-2 text-sm text-slate-500">{resolvedDescription}</p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6">
          <input
            ref={inputRef}
            className="sr-only"
            type="file"
            aria-label={fileLabel}
            disabled={disabled}
            onChange={(event) => {
              const file = event.target.files?.[0];
              setSelectedFileName(file ? file.name : null);
              if (file && onUpload) {
                onUpload(file);
              }
            }}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="default"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
            >
              {fileLabel}
            </Button>
            <p className="text-sm text-slate-600" aria-live="polite">
              {selectedFileName ?? fileEmpty}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
