"use client";

import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import type { Employee } from "@/lib/schedule";

type PdfExportDialogProps = {
  employees: Employee[];
  isExporting: boolean;
  onExport: (employeeId: string) => void;
  onClose: () => void;
};

export const PdfExportDialog = ({
  employees,
  isExporting,
  onExport,
  onClose,
}: PdfExportDialogProps) => {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    onExport(String(form.get("employeeId") ?? ""));
  };

  return (
    <Dialog
      open
      title="PDF 다운로드"
      onOpenChange={(open) => {
        if (!open && !isExporting) onClose();
      }}
      footer={<></>}
    >
      <form onSubmit={submit} className="space-y-6" aria-busy={isExporting}>
        <Select
          label="출력할 근무자"
          name="employeeId"
          defaultValue=""
          disabled={isExporting}
          options={[
            { value: "", label: "전체 선택" },
            ...employees.map((employee) => ({
              value: employee.id,
              label: employee.name,
            })),
          ]}
        />
        <div className="flex justify-end gap-3">
          <Button
            appearance="outline"
            size="sm"
            className="min-h-9! px-4! text-xs/normal"
            onClick={onClose}
            disabled={isExporting}
          >
            취소
          </Button>
          <Button
            type="submit"
            size="sm"
            className="min-h-9! px-4! text-xs/normal"
            disabled={isExporting || !employees.length}
          >
            {isExporting ? "PDF 생성 중…" : "다운로드"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
