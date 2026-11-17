"use client";

import { Select } from "@/components/ui/select";
import { TextField } from "@/components/ui/text-field";
import {
  categories,
  labels,
  type Category,
  type ShiftType,
} from "@/lib/schedule";

type AssignmentOptionsValue = {
  category: Category;
  typeId: string;
  memo?: string;
};

type AssignmentOptionsProps = {
  value: AssignmentOptionsValue;
  onChange: (value: AssignmentOptionsValue) => void;
  types: ShiftType[];
  deletedTypeId?: string;
};

export const AssignmentOptions = ({
  value,
  onChange,
  types,
  deletedTypeId,
}: AssignmentOptionsProps) => (
  <>
    <div
      className="grid grid-cols-4 gap-1 rounded-[9px] bg-canvas-subtle p-1"
      role="group"
      aria-label="일정 종류"
    >
      {categories.map((category) => (
        <button
          key={category}
          type="button"
          aria-pressed={value.category === category}
          onClick={() => onChange({ ...value, category })}
          className="rounded-md border-0 bg-transparent px-1 py-[9px] text-xs/normal text-content-secondary aria-pressed:bg-canvas aria-pressed:font-bold aria-pressed:text-brand-content aria-pressed:shadow-[0_1px_5px_#17171914]"
        >
          {labels[category]}
        </button>
      ))}
    </div>
    {value.category === "work" && (
      <Select
        label="근무 타입"
        required
        placeholder="근무 타입 선택"
        value={value.typeId}
        onChange={(event) => onChange({ ...value, typeId: event.target.value })}
        options={types.map((type) => ({
          value: type.id,
          label: `${type.name} · ${type.start} ~ ${type.end}${type.end < type.start ? " (다음 날)" : ""}${type.id === deletedTypeId ? " (삭제된 타입)" : ""}`,
        }))}
        error={
          !types.length ? "먼저 왼쪽에서 근무 타입을 추가해 주세요." : undefined
        }
      />
    )}
    {value.category === "other" && (
      <TextField
        label="기타 메모"
        placeholder="예: 교육, 외부 지원"
        maxLength={200}
        value={value.memo ?? ""}
        onChange={(event) => onChange({ ...value, memo: event.target.value })}
      />
    )}
  </>
);
