"use client";

import { FaFloppyDisk } from "react-icons/fa6";
import { usePlannerStore } from "@/providers/planner-provider";
import { hasUnsavedChanges } from "@/stores/planner-store";

export const SavePlannerButton = () => {
  const dirty = usePlannerStore(hasUnsavedChanges);
  const status = usePlannerStore((state) => state.storageStatus);
  const conflict = usePlannerStore((state) => state.conflict);
  const save = usePlannerStore((state) => state.saveSchedule);
  const saving = status === "saving";

  return (
    <div className="flex items-center gap-2">
      <span role="status" className="text-[10px] text-content-tertiary">
        {dirty ? "저장하지 않은 변경사항" : "변경사항 없음"}
      </span>
      <button
        type="button"
        onClick={() => void save()}
        disabled={
          !dirty ||
          saving ||
          conflict ||
          status === "loading" ||
          status === "blocked"
        }
        aria-busy={saving}
        className="flex items-center gap-1.5 rounded-md bg-danger px-3 py-[7px] text-[11px] font-semibold text-white enabled:hover:brightness-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <FaFloppyDisk aria-hidden="true" className="size-3" />
        {saving ? "저장 중…" : "저장"}
      </button>
    </div>
  );
};
