"use client";

import { useState } from "react";
import { FaFilePdf } from "react-icons/fa6";
import { employeesInMonth } from "@/lib/schedule";
import { PdfExportDialog } from "./pdf-export-dialog";
import type { HolidayMap } from "@/lib/holidays";
import { buildSchedulePdfData } from "@/lib/schedule-pdf-data";
import { usePlannerStore } from "@/providers/planner-provider";

type PdfExportButtonProps = {
  month: string;
  holidays: HolidayMap;
  disabled: boolean;
};

export const PdfExportButton = ({
  month,
  holidays,
  disabled,
}: PdfExportButtonProps) => {
  const [status, setStatus] = useState<"closed" | "selecting" | "exporting">(
    "closed",
  );
  const isExporting = status === "exporting";

  const data = usePlannerStore((state) => state.data);
  const notify = usePlannerStore((state) => state.notify);

  const exportPdf = async (employeeId: string) => {
    if (isExporting || disabled) return;

    setStatus("exporting");

    try {
      const snapshot = buildSchedulePdfData(data, month, holidays, employeeId);
      // Keep the PDF engine and font loading out of the initial calendar bundle.
      const { downloadSchedulePdf } =
        await import("@/lib/download-schedule-pdf");
      await downloadSchedulePdf(snapshot);
      setStatus("closed");
    } catch {
      notify("PDF를 만들지 못했어요. 잠시 후 다시 시도해 주세요.");
      setStatus("selecting");
    }
  };

  return (
    <>
      <button
        type="button"
        disabled={disabled || isExporting}
        aria-busy={isExporting}
        onClick={() => setStatus("selecting")}
        className="flex shrink-0 items-center gap-1.5 rounded-md border border-line bg-canvas px-2.5 py-[7px] text-[11px] text-content-secondary enabled:hover:bg-surface-hover"
      >
        <FaFilePdf aria-hidden="true" className="size-3" />
        {isExporting ? "PDF 생성 중…" : "PDF 다운로드"}
      </button>
      {status !== "closed" && (
        <PdfExportDialog
          key={month}
          employees={employeesInMonth(data.employees, month)}
          isExporting={isExporting}
          onExport={exportPdf}
          onClose={() => setStatus("closed")}
        />
      )}
    </>
  );
};
