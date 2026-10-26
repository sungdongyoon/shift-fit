"use client";
import { useMonthEmployees, useShiftTypes } from "@/hooks/use-month-schedule";
import type { AssignmentEditor, Editor } from "@/lib/editor";
import { getAssignment, labels, type Category } from "@/lib/schedule";
import { usePlannerStore } from "@/providers/planner-provider";

type AssignmentFieldsProps = {
  editor: AssignmentEditor;
  onChange: (editor: Editor) => void;
};

export const AssignmentFields = ({
  editor,
  onChange,
}: AssignmentFieldsProps) => {
  const employees = useMonthEmployees();
  const types = useShiftTypes();
  const entries = usePlannerStore((state) => state.data.entries);
  const existing = getAssignment({ entries }, editor.date, editor.employee);

  return (
    <>
      <div className="text-[17px] font-semibold">
        {editor.date.replaceAll("-", ". ")}
        <span className="mt-2 block text-[11px] font-normal text-content-tertiary">
          하루에 한 사람당 하나의 일정을 배정해요.
        </span>
      </div>
      <label className="flex flex-col gap-2 text-[13px] font-medium">
        근무자
        <select
          disabled={editor.original}
          value={editor.employee}
          onChange={(event) =>
            onChange({ ...editor, employee: event.target.value })
          }
          className="w-full rounded-control border border-line-input bg-surface p-3 text-sm/normal text-content"
        >
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.name}
            </option>
          ))}
        </select>
      </label>
      <div
        className="grid grid-cols-4 gap-[3px] rounded-[9px] bg-canvas-subtle p-1"
        role="group"
        aria-label="일정 종류"
      >
        {(Object.keys(labels) as Category[]).map((category) => (
          <button
            key={category}
            type="button"
            aria-pressed={editor.category === category}
            onClick={() => onChange({ ...editor, category })}
            className="rounded-md border-0 bg-transparent px-1 py-[9px] text-xs/normal text-content-secondary aria-pressed:bg-canvas aria-pressed:font-bold aria-pressed:text-brand-content aria-pressed:shadow-[0_1px_5px_#17171914]"
          >
            {labels[category]}
          </button>
        ))}
      </div>
      {editor.category === "work" && (
        <label className="flex flex-col gap-2 text-[13px] font-medium">
          근무 타입
          <select
            required
            value={editor.typeId}
            onChange={(event) =>
              onChange({ ...editor, typeId: event.target.value })
            }
            className="w-full rounded-control border border-line-input bg-surface p-3 text-sm/normal text-content"
          >
            <option value="" disabled>
              근무 타입 선택
            </option>
            {editor.typeId === "__existing" && (
              <option value="__existing">
                {existing.shift?.name} · 기존 배정 유지
              </option>
            )}
            {types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name} · {type.start} ~ {type.end}
                {type.end < type.start ? " (다음 날)" : ""}
              </option>
            ))}
          </select>
          {!types.length && editor.typeId !== "__existing" && (
            <small className="text-[11px] text-danger">
              먼저 왼쪽에서 근무 타입을 추가해 주세요.
            </small>
          )}
        </label>
      )}
      <p className="rounded-control bg-canvas-subtle p-3 text-[11px] leading-[1.9] text-content-tertiary">
        {existing.category === "off"
          ? "이 직원의 휴무를 선택한 일정으로 변경해요."
          : "이미 배정된 일정이 있어요. 저장하면 기존 일정을 변경해요."}
      </p>
    </>
  );
};
