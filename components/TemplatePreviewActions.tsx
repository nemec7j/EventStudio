"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

type TemplatePreviewActionsProps = {
  eventId: string;
  downloadHref: string;
  fileName: string;
  backLabel: string;
  downloadLabel: string;
  exportPdfLabel: string;
  html: string;
};

export default function TemplatePreviewActions({
  eventId,
  downloadHref,
  fileName,
  backLabel,
  downloadLabel,
  exportPdfLabel,
  html,
}: TemplatePreviewActionsProps) {
  const handleExportPdf = () => {
    const printWindow = window.open("", "_blank", "width=1024,height=768");
    if (!printWindow) {
      return;
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 200);
  };

  return (
    <div className="mt-4 flex flex-wrap gap-3">
      <Button asChild variant="outline">
        <Link href={`/events/${eventId}`}>{backLabel}</Link>
      </Button>
      <Button
        asChild
        variant="default"
        className="bg-[#525e77] text-white hover:bg-[#9badb5]"
      >
        <a href={downloadHref} download={fileName} className="text-white">
          {downloadLabel}
        </a>
      </Button>
      <Button
        type="button"
        variant="outline"
        className="border-[#525e77] text-[#525e77] hover:bg-[#9badb5]/20"
        onClick={handleExportPdf}
      >
        {exportPdfLabel}
      </Button>
    </div>
  );
}
