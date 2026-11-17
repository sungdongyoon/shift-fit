"use client";

import type { Employee } from "@/lib/schedule";

type EmployeeCheckboxListProps = {
  employees: Employee[];
  selected: string[];
  onChange: (ids: string[]) => void;
};

export const EmployeeCheckboxList = ({
  employees,
  selected,
  onChange,
}: EmployeeCheckboxListProps) => {
  const allSelected =
    employees.length > 0 &&
    employees.every((employee) => selected.includes(employee.id));

  const toggle = (id: string) => {
    onChange(
      selected.includes(id)
        ? selected.filter((value) => value !== id)
        : [...selected, id],
    );
  };

  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-xs font-medium">
        근무자 선택 · {selected.length}명
      </legend>
      <button
        type="button"
        onClick={() =>
          onChange(allSelected ? [] : employees.map((employee) => employee.id))
        }
        className="mb-2 text-[11px] text-brand-content underline underline-offset-2"
      >
        {allSelected ? "근무자 선택 해제" : "근무자 전체 선택"}
      </button>
      <div className="grid max-h-44 grid-cols-2 gap-1.5 overflow-y-auto rounded-control border border-line p-2 max-[480px]:grid-cols-1">
        {employees.map((employee) => (
          <label
            key={employee.id}
            className="flex min-w-0 cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-xs hover:bg-canvas-subtle"
          >
            <input
              type="checkbox"
              checked={selected.includes(employee.id)}
              onChange={() => toggle(employee.id)}
              className="size-4 shrink-0 accent-brand"
            />
            <span className="min-w-0 break-words">{employee.name}</span>
            {employee.position && (
              <span className="min-w-0 break-words text-[10px] text-content-tertiary">
                {employee.position}
              </span>
            )}
          </label>
        ))}
        {!employees.length && (
          <p className="col-span-full p-2 text-xs text-content-tertiary">
            선택할 근무자가 없어요.
          </p>
        )}
      </div>
    </fieldset>
  );
};
