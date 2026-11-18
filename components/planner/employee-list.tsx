"use client";

import { PanelHeading } from "./panel-heading";
import { useState } from "react";
import { useMonthSchedule } from "@/hooks/use-month-schedule";
import { usePlannerStore } from "@/providers/planner-provider";
import { FaPlus } from "react-icons/fa6";
import { FaSearch } from "react-icons/fa";
import { RetiredEmployeeList } from "./retired-employee-list";
import { EmployeeCard } from "./employee-card";

export const EmployeeList = () => {
  const { employees, stats } = useMonthSchedule();

  const [search, setSearch] = useState("");
  const [retiredOpen, setRetiredOpen] = useState(false);

  const ready = usePlannerStore(
    (state) =>
      state.storageStatus !== "loading" && state.storageStatus !== "blocked",
  );
  const openEditor = usePlannerStore((state) => state.openEditor);

  const searchTerm = search.trim();
  const activeEmployees = stats.filter((employee) => !employee.endDate);
  const retiredEmployees = employees.filter((employee) => employee.endDate);
  const filteredEmployees = activeEmployees.filter((employee) =>
    employee.name.includes(searchTerm),
  );
  const hasNoEmployees = activeEmployees.length === 0;
  const hasNoSearchResults = !hasNoEmployees && filteredEmployees.length === 0;

  const addEmployee = () => {
    openEditor({
      kind: "employee",
      startDate: "",
      name: "",
    });
  };

  return (
    <div className="pt-[22px] max-[960px]:pt-0">
      <PanelHeading title="근무자" count={activeEmployees.length}>
        <button
          className="size-[26px] flex justify-center items-center rounded-md border border-line bg-canvas text-xl/normal leading-5 text-content-secondary hover:bg-surface-hover"
          aria-label="근무자 추가"
          disabled={!ready}
          onClick={addEmployee}
        >
          <FaPlus className="size-3" />
        </button>
      </PanelHeading>
      <p className="mt-[9px] mb-[19px] text-[10px] leading-[1.6] text-content-tertiary">
        이름을 누르면 개인 일정이 강조됩니다.
      </p>
      <label className="mb-2 flex items-center gap-[7px] rounded-[7px] border border-line px-2.5 py-2">
        <span className="text-xl/normal leading-4 text-content-tertiary">
          <FaSearch className="size-3" />
        </span>
        <input
          aria-label="근무자 검색"
          placeholder="근무자 검색"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="min-w-0 w-full border-0 bg-transparent text-[11px] text-content outline-offset-[6px] placeholder:text-content-disabled"
        />
      </label>
      <div className="flex max-h-[510px] flex-col gap-0 overflow-y-auto p-[3px] max-[960px]:gap-[3px] max-[960px]:grid max-[960px]:max-h-[360px] max-[960px]:grid-cols-2">
        {filteredEmployees.map((employee, index) => (
          <div key={employee.id}>
            {index > 0 && (
              <div
                aria-hidden="true"
                className="mx-2 my-1 h-px bg-line max-[960px]:hidden"
              />
            )}
            <EmployeeCard employee={employee} />
          </div>
        ))}
        {hasNoEmployees && (
          <div className="py-6 text-center text-[11px] leading-[1.9] text-content-tertiary">
            등록된 근무자가 없습니다.
          </div>
        )}
        {hasNoSearchResults && (
          <p className="py-6 text-center text-[11px] leading-[1.9] text-content-tertiary">
            검색 결과가 없어요.
          </p>
        )}
      </div>
      <button
        className="mt-3 min-h-9 w-full rounded-[7px] border border-dashed border-line bg-transparent text-[11px] text-content-secondary hover:bg-canvas-subtle"
        disabled={!ready}
        onClick={addEmployee}
      >
        + 근무자 추가
      </button>
      <button
        className="mt-2 min-h-9 w-full rounded-[7px] border border-line text-[11px] text-content-secondary hover:bg-canvas-subtle"
        disabled={!ready}
        onClick={() => setRetiredOpen(true)}
      >
        퇴사자 리스트 ({retiredEmployees.length})
      </button>
      <RetiredEmployeeList
        open={retiredOpen}
        onOpenChange={setRetiredOpen}
        employees={retiredEmployees}
      />
    </div>
  );
};
