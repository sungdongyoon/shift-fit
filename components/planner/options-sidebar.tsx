"use client";

import { useMonthSchedule } from "@/hooks/use-month-schedule";
import { EmployeeList } from "./employee-list";
import { OffTargetSettings } from "./off-target-settings";

const ValidationNotice = () => {
  const { employees, mismatch } = useMonthSchedule();

  if (!employees.length) return null;

  return (
    <div
      className="group/validation mt-[22px] flex gap-2 rounded-control bg-warning-subtle px-2.5 py-3 data-[valid=true]:bg-success-subtle max-[960px]:col-span-full max-[960px]:mt-0"
      data-valid={!mismatch}
    >
      <span className="mt-px grid size-3.5 shrink-0 place-items-center rounded-full border border-current text-[10px] text-warning group-data-[valid=true]/validation:text-success">
        {mismatch ? "!" : "✓"}
      </span>
      <div>
        <strong className="text-[10px] font-semibold text-warning group-data-[valid=true]/validation:text-success">
          {mismatch
            ? `${mismatch}명의 휴무를 확인해 주세요`
            : "모든 직원의 휴무가 맞아요"}
        </strong>
        <p className="mt-1 text-[9px] leading-[1.7] text-content-secondary">
          {mismatch
            ? "빨간색 휴무 횟수를 기준에 맞춰 주세요."
            : "이번 달 휴무 기준을 충족했어요."}
        </p>
      </div>
    </div>
  );
};

export const OptionsSidebar = () => (
  <aside
    className="flex flex-col border-l border-line px-[18px] py-6 max-[1200px]:px-[13px] max-[1200px]:py-5 max-[960px]:col-span-full max-[960px]:grid max-[960px]:grid-cols-[220px_minmax(0,1fr)] max-[960px]:gap-6 max-[960px]:border-t max-[960px]:border-l-0 max-[640px]:flex max-[640px]:gap-5 max-[640px]:px-4 max-[640px]:py-5"
    aria-label="옵션 및 근무자"
  >
    <OffTargetSettings />
    <EmployeeList />
    <ValidationNotice />
  </aside>
);
