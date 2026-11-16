"use client";

import { BsThreeDots } from "react-icons/bs";
import { categories, employeeStartDate, labels, type EmployeeScheduleSummary } from "@/lib/schedule";
import { usePlannerStore } from "@/providers/planner-provider";

type EmployeeCardProps = {
  employee: EmployeeScheduleSummary;
};

export const EmployeeCard = ({ employee }: EmployeeCardProps) => {
  const isSelected = usePlannerStore((state) => state.view.selected === employee.id);
  const selectEmployee = usePlannerStore((state) => state.selectEmployee);
  const openEditor = usePlannerStore((state) => state.openEditor);

  return (
    <div
      className="rounded-control border border-transparent px-[7px] py-[13px] data-[selected=true]:border-brand data-[selected=true]:bg-brand-subtle"
      data-selected={isSelected}
    >
      <div className="flex items-center gap-[5px]">
        <button
          className="flex min-w-0 flex-1 items-center gap-[9px] border-0 bg-transparent text-left"
          aria-pressed={isSelected}
          onClick={() => selectEmployee(employee.id)}
        >
          <span
            className="grid size-[29px] shrink-0 place-items-center rounded-[10px] text-xs/normal font-semibold"
            style={{
              background: `${employee.color}18`,
              color: employee.color,
            }}
          >
            {employee.name.slice(0, 1)}
          </span>
          <strong className="text-xs/normal font-semibold [overflow-wrap:anywhere]">
            {employee.name}
          </strong>
        </button>
        <button
          className="ml-auto h-[26px] w-6 border-0 bg-transparent text-xl/normal text-content-tertiary"
          aria-label={`${employee.name} 정보 수정`}
          onClick={() =>
            openEditor({
              kind: "employee",
              startDate: employeeStartDate(employee),
              endDate: employee.endDate ?? "",
              id: employee.id,
              name: employee.name,
              color: employee.color,
            })
          }
        >
          <BsThreeDots className="size-3" />
        </button>
      </div>
      <div className="mt-[13px] ml-[38px] grid grid-cols-5 gap-[5px] max-[1200px]:ml-0 max-[960px]:ml-[38px] max-[640px]:ml-0">
        {categories.map((category) => (
          <div
            key={category}
            className="flex flex-col gap-[5px]"
          >
            <span className="text-[9px] text-content-tertiary min-[1600px]:text-[10px]">
              {labels[category]}
            </span>
            <b className="text-xs/normal font-semibold whitespace-nowrap">
              {employee.counts[category]}
            </b>
          </div>
        ))}
      </div>
    </div>
  );
};
