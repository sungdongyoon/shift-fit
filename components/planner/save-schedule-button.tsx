"use client";

import { FaFloppyDisk } from "react-icons/fa6";
import type { HolidayMap } from "@/lib/holidays";
import { usePlannerStore } from "@/providers/planner-provider";

export const SaveScheduleButton = ({ holidays, disabled }: { holidays: HolidayMap; disabled: boolean }) => {
  const save = usePlannerStore((state) => state.saveMonth);
  const readOnly = usePlannerStore((state) => Boolean(state.selectedSavedMonth));
  const blocked = usePlannerStore((state) => state.storageStatus === "blocked");

  return (
    <button
      type="button"
      disabled={disabled || blocked || readOnly}
      onClick={() => save(holidays)}
      className="flex shrink-0 items-center gap-1.5 rounded-md border border-danger bg-danger px-3 py-[7px] text-[11px] font-semibold text-white enabled:hover:brightness-90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <FaFloppyDisk aria-hidden="true" className="size-3" />
      저장
    </button>
  );
};
