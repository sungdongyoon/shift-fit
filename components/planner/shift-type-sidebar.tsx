"use client";

import { PanelHeading } from "./panel-heading";
import { useShiftTypes } from "@/hooks/use-month-schedule";
import { assignmentColor, colors, labels, type Category } from "@/lib/schedule";
import { usePlannerStore } from "@/providers/planner-provider";
import { Glyph } from "./glyph";
import { tint } from "./presentation";

export const ShiftTypeSidebar = () => {
  const types = useShiftTypes();
  const open = usePlannerStore((state) => state.openEditor);

  return (
    <aside
      className="flex flex-col border-r border-line px-[18px] py-6 max-[1200px]:px-[13px] max-[1200px]:py-5 max-[640px]:border-r-0 max-[640px]:border-b max-[640px]:p-4"
      aria-label="근무 타입"
    >
      <PanelHeading title="근무 타입" count={types.length}>
        <button
          className="size-[26px] rounded-md border border-line bg-canvas text-xl/normal leading-5 text-content-secondary hover:bg-surface-hover"
          aria-label="근무 타입 추가"
          onClick={() =>
            open({
              kind: "type",
              name: "",
              start: "09:00",
              end: "18:00",
              color: colors[types.length % colors.length],
            })
          }
        >
          +
        </button>
      </PanelHeading>
      <p className="mt-[9px] mb-[19px] text-[10px] leading-[1.6] text-content-tertiary max-[640px]:mb-3">
        우리 매장에 맞는 근무를 만들어요.
      </p>
      <div className="flex flex-col gap-[9px] max-[640px]:flex-row max-[640px]:overflow-x-auto max-[640px]:p-0.5">
        {types.map((type) => (
          <button
            key={type.id}
            className="group/type relative flex w-full items-center gap-2.5 rounded-control border border-line bg-canvas px-2.5 py-[13px] text-left hover:border-[var(--shift-color)] hover:bg-[var(--shift-bg)] max-[1200px]:gap-[7px] max-[1200px]:px-2 max-[1200px]:py-3 max-[640px]:w-auto max-[640px]:min-w-[135px] max-[640px]:shrink-0"
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
              ↗
            </span>
          </button>
        ))}
      </div>
      <button
        className="mt-3 min-h-9 w-full rounded-[7px] border border-dashed border-line bg-transparent text-[11px] text-content-secondary hover:bg-canvas-subtle max-[640px]:mt-2.5"
        onClick={() =>
          open({
            kind: "type",
            name: "",
            start: "09:00",
            end: "18:00",
            color: colors[types.length % colors.length],
          })
        }
      >
        + 근무 타입 추가
      </button>
      <div className="mt-[25px] mb-[21px] h-px bg-line max-[640px]:hidden" />
      <h3 className="text-[11px] font-semibold text-content-secondary max-[640px]:hidden">
        근무 외 일정
      </h3>
      <div className="mt-4 mb-[26px] flex flex-col gap-3.5 text-[11px] text-content-secondary max-[640px]:hidden">
        {(["off", "leave", "other"] as Category[]).map((category) => (
          <div key={category} className="flex items-center gap-[9px]">
            <span
              className="size-2 rounded-[3px]"
              style={{ background: assignmentColor({ category }) }}
            />
            {labels[category]}
          </div>
        ))}
      </div>
      <div className="rounded-control bg-canvas-subtle px-3 py-4 max-[640px]:hidden">
        <Glyph name="calendar" className="mb-[11px] text-content-tertiary" />
        <strong className="block text-[11px]">근무표 작성 방법</strong>
        <p className="mt-2 text-[10px] leading-[1.8] text-content-tertiary">
          날짜 위의 + 버튼으로
          <br />
          근무를 배정해 보세요.
        </p>
        <p className="mt-2 text-[10px] leading-[1.8] text-content-tertiary">
          이름을 누르면 언제든
          <br />
          일정을 수정할 수 있어요.
        </p>
      </div>
      <div className="mt-auto pt-9 text-[9px] leading-[1.9] text-content-tertiary max-[640px]:hidden">
        조금 더 쉬운 스케줄 관리
        <br />
        <b className="font-normal tracking-[0.2px]">Made to fit your team.</b>
      </div>
    </aside>
  );
};
