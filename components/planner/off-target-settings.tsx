"use client";

import { PanelHeading } from "./panel-heading";
import { daysInMonth } from "@/lib/schedule";
import { usePlannerStore } from "@/providers/planner-provider";

export const OffTargetSettings = () => {
  const month = usePlannerStore((state) => state.view.month);
  const target = usePlannerStore(
    (state) => state.data.targets[state.view.month] ?? 8,
  );
  const ready = usePlannerStore((state) => state.storageStatus !== "loading");
  const setOffTarget = usePlannerStore((state) => state.setOffTarget);
  const days = month ? daysInMonth(month) : 31;

  return (
    <div className="border-b border-line pb-[23px] max-[960px]:border-b-0 max-[640px]:border-b max-[640px]:pb-5">
      <PanelHeading title="근무 설정">
        <span className="text-[17px] text-content-tertiary">⚙</span>
      </PanelHeading>
      <label
        className="mt-5 mb-[9px] block text-[11px] text-content-secondary"
        htmlFor="monthly-off"
      >
        월 기준 휴무 횟수
      </label>
      <div className="flex h-10 items-center overflow-hidden rounded-[7px] border border-line px-3">
        <input
          id="monthly-off"
          type="number"
          min="0"
          max={days}
          value={target}
          disabled={!ready}
          onChange={(event) => setOffTarget(event.target.valueAsNumber)}
          className="h-8 min-w-0 w-full border-0 bg-transparent font-semibold text-content"
        />
        <span className="shrink-0 text-[11px] text-content-tertiary">
          회 / 인
        </span>
      </div>
      <p className="mt-[9px] text-[10px] leading-[1.8] text-content-tertiary">
        이 달의 모든 근무자에게 적용돼요.
        <br />
        연차와 기타는 휴무에 포함되지 않아요.
      </p>
    </div>
  );
};
