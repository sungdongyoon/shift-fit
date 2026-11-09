"use client";

import { Select } from "@/components/ui/select";
import { TextField } from "@/components/ui/text-field";
import { useEmployees, useShiftTypes } from "@/hooks/use-month-schedule";
import type { AssignmentEditor, Editor } from "@/lib/editor";
import { categories, getAssignment, labels } from "@/lib/schedule";
import { usePlannerStore } from "@/providers/planner-provider";

type AssignmentFieldsProps = {
  editor: AssignmentEditor;
  onChange: (editor: Editor) => void;
};

export const AssignmentFields = ({
  editor,
  onChange,
}: AssignmentFieldsProps) => {
  const employees = useEmployees();

  const types = useShiftTypes();

  const entries = usePlannerStore((state) => state.data.entries);
  const existing = getAssignment({ entries, employees }, editor.date, editor.employee);
  const assignedShift = existing.shift;
  const hasDeletedShift = Boolean(
    assignedShift && !types.some((type) => type.id === assignedShift.id),
  );
  const selectableTypes = hasDeletedShift && assignedShift
    ? [...types, assignedShift]
    : types;

  return (
    <>
      <div className="text-[17px] font-semibold">
        {editor.date.replaceAll("-", ". ")}
        <span className="mt-2 block text-[11px] font-normal text-content-tertiary">
          하루에 한 사람당 하나의 일정을 배정해요.
        </span>
      </div>
      {editor.original ? (
        <div className="flex flex-col gap-2 text-[13px] font-medium">
          <span>근무자</span>
          <p className="text-sm/normal text-content">
            {employees.find((employee) => employee.id === editor.employee)?.name}
          </p>
        </div>
      ) : (
        <Select
          label="근무자"
          value={editor.employee}
          onChange={(event) => onChange({ ...editor, employee: event.target.value })}
          options={employees.map((employee) => ({ value: employee.id, label: employee.name }))}
        />
      )}
      <div
        className="grid grid-cols-5 gap-[3px] rounded-[9px] bg-canvas-subtle p-1"
        role="group"
        aria-label="일정 종류"
      >
        {categories.map((category) => (
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
        <Select
          label="근무 타입"
          required
          placeholder="근무 타입 선택"
          value={editor.typeId}
          onChange={(event) => onChange({ ...editor, typeId: event.target.value })}
          options={selectableTypes.map((type) => ({
            value: type.id,
            label: `${type.name} · ${type.start} ~ ${type.end}${type.end < type.start ? " (다음 날)" : ""}${hasDeletedShift && type.id === assignedShift?.id ? " (삭제된 타입)" : ""}`,
          }))}
          error={!selectableTypes.length
            ? "먼저 왼쪽에서 근무 타입을 추가해 주세요."
            : undefined}
        />
      )}
      {editor.category === "other" && (
        <TextField
          label="기타 메모"
          placeholder="예: 교육, 외부 지원"
          value={editor.memo ?? ""}
          maxLength={200}
          onChange={(event) => onChange({ ...editor, memo: event.target.value })}
        />
      )}
      <p className="rounded-control bg-canvas-subtle p-3 text-[11px] leading-[1.9] text-content-tertiary">
        {existing.category === "unassigned"
          ? "이 직원의 미배정 상태를 선택한 일정으로 변경해요."
          : "이미 배정된 일정이 있어요. 저장하면 기존 일정을 변경해요."}
      </p>
    </>
  );
};
