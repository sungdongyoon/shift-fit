"use client";

import { Dialog } from "@/components/ui/dialog";
import { employeeStartDate, type Employee } from "@/lib/schedule";
import { usePlannerStore } from "@/providers/planner-provider";

type RetiredEmployeeListProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Employee[];
};

export const RetiredEmployeeList = ({ open, onOpenChange, employees }: RetiredEmployeeListProps) => {
  const openEditor = usePlannerStore((state) => state.openEditor);

  const editEmployee = (employee: Employee) => {
    onOpenChange(false);
    openEditor({
      kind: "employee",
      id: employee.id,
      name: employee.name,
      startDate: employeeStartDate(employee),
      endDate: employee.endDate,
      position: employee.position ?? "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="퇴사자 리스트" className="[&_h2]:text-base">
      <div className="flex flex-col divide-y divide-line">
        {employees.map((employee) => (
          <div key={employee.id} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1 break-words">
                <span className="text-xs font-semibold">{employee.name}</span>
                {employee.position && <span className="text-[10px] text-content-tertiary [overflow-wrap:anywhere]">{employee.position}</span>}
              </p>
              <p className="mt-1 text-[11px] text-content-tertiary">
                {employeeStartDate(employee)} ~ {employee.endDate}
              </p>
            </div>
            <button type="button" onClick={() => editEmployee(employee)} className="shrink-0 rounded-md border border-line px-3 py-2 text-[11px] hover:bg-canvas-subtle">
              정보 수정
            </button>
          </div>
        ))}
        {!employees.length && <p className="py-5 text-center text-xs text-content-tertiary">퇴사 처리된 근무자가 없습니다.</p>}
      </div>
    </Dialog>
  );
};
