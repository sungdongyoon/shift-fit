"use client";

import { PanelHeading } from "./panel-heading";
import { useShiftTypes, useReadOnlySchedule } from "@/hooks/use-month-schedule";
import { assignmentColor, colors, getMonthShiftTypes, labels, type Category } from "@/lib/schedule";
import { usePlannerStore } from "@/providers/planner-provider";
import { previousMonthKey } from "@/lib/schedule-commands";
import { SavedScheduleList } from "./saved-schedule-list";
import { tint } from "./presentation";
import { FaArrowUpRightFromSquare } from "react-icons/fa6";

export const ShiftTypeSidebar = () => {
  const types = useShiftTypes();
  const readOnly = useReadOnlySchedule();

  const open = usePlannerStore((state) => state.openEditor);
  const copyTypes = usePlannerStore((state) => state.copyPreviousMonthTypes);
  const month = usePlannerStore((state) => state.view.month);
  const canCopy = usePlannerStore((state) => Boolean(state.view.month) &&
    getMonthShiftTypes(state.data, previousMonthKey(state.view.month)).some((type) => !type.archived));

  const addShiftType = () => {
    open({
      kind: "type",
      name: "",
      start: "09:00",
      end: "18:00",
      color: colors[types.length % colors.length],
    });
  };

  return (
    <aside
      className="flex flex-col border-r border-line px-[18px] py-6 max-[1200px]:px-[13px] max-[1200px]:py-5 max-[640px]:border-r-0 max-[640px]:border-b max-[640px]:p-4"
      aria-label="근무 타입"
    >
      <PanelHeading title="근무 타입" count={types.length} />
      <p className="mt-[9px] text-[10px] leading-[1.6] text-content-tertiary">
        {readOnly ? "저장 당시의 근무 타입이에요." : "이 달의 근무 타입만 변경돼요."}
      </p>
      <div className="mt-3 mb-[19px] flex flex-col gap-2">
        <button
          className="min-h-9 w-full rounded-[7px] border border-line bg-canvas px-2 py-2 text-[11px] text-content-secondary enabled:hover:bg-canvas-subtle disabled:cursor-not-allowed disabled:opacity-50"
          onClick={copyTypes}
          disabled={readOnly || !month || !canCopy}
        >
          이전 월 근무타입 복사하기
        </button>
        <button
          className="min-h-9 w-full rounded-[7px] border border-dashed border-line bg-transparent px-2 py-2 text-[11px] text-content-secondary hover:bg-canvas-subtle disabled:opacity-50"
          onClick={addShiftType}
          disabled={readOnly || !month}
        >
          새로운 근무 타입 추가
        </button>
        {!canCopy && (
          <p className="text-[10px] leading-[1.6] text-content-tertiary">
            이전 월에 복사할 근무 타입이 없어요.
          </p>
        )}
      </div>
      <div className="flex flex-col gap-[9px] max-[640px]:flex-row max-[640px]:overflow-x-auto max-[640px]:p-0.5">
        {types.map((type) => (
          <button
            key={type.id}
            disabled={readOnly}
            className="group/type relative flex disabled:cursor-default disabled:opacity-100 w-full items-center gap-2.5 rounded-control border border-line bg-canvas px-2.5 py-[13px] text-left hover:border-[var(--shift-color)] hover:bg-[var(--shift-bg)] max-[1200px]:gap-[7px] max-[1200px]:px-2 max-[1200px]:py-3 max-[640px]:w-auto max-[640px]:min-w-[135px] max-[640px]:shrink-0"
            style={tint(type.color)}
            onClick={() => open({ kind: "type", ...type })}
          >
            <span className="h-8 w-[5px] shrink-0 rounded bg-[var(--shift-color)]" />
            <span>
              <strong className="block text-xs/normal font-semibold min-[1600px]:text-[13px]">
                {type.name}
              </strong>
              <small className="mt-[5px] block text-[10px] whitespace-nowrap text-content-tertiary max-[1200px]:text-[9px]">
                {type.start} – {type.end}
                {type.end < type.start ? " (+1일)" : ""}
              </small>
            </span>
            <span className="ml-auto text-[13px] text-content-disabled opacity-0 group-hover/type:opacity-100 group-focus-visible/type:opacity-100 max-[1200px]:hidden [@media(hover:none)]:opacity-100">
              <FaArrowUpRightFromSquare className="size-3" />
            </span>
          </button>
        ))}
      </div>
      <div className="mt-[25px] mb-[21px] h-px bg-line max-[640px]:hidden" />
      <h3 className="text-[11px] font-semibold text-content-secondary max-[640px]:hidden">
        근무 외 일정
      </h3>
      <div className="mt-4 mb-[26px] flex flex-col gap-3.5 text-[11px] text-content-secondary max-[640px]:hidden">
        {(["off", "leave", "other", "unassigned"] as Category[]).map((category) => (
          <div key={category} className="flex items-center gap-[9px]">
            <span
              className="size-2 rounded-[3px]"
              style={{ background: assignmentColor({ category }) }}
            />
            {labels[category]}
          </div>
        ))}
      </div>
      <SavedScheduleList />
    </aside>
  );
};
