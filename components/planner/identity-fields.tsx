"use client";

import { TextField } from "@/components/ui/text-field";
import type { Editor, EmployeeEditor, ShiftTypeEditor } from "@/lib/editor";
import { colors } from "@/lib/schedule";
import { Glyph } from "./glyph";

type IdentityFieldsProps = {
  editor: EmployeeEditor | ShiftTypeEditor;
  onChange: (editor: Editor) => void;
};

const identityDescription = (editor: EmployeeEditor | ShiftTypeEditor) => {
  if (editor.kind === "type") {
    return "타입을 수정하면 기존 배정에도 반영돼요. 삭제하면 기존 배정은 유지되며, 종료 시간이 이르면 다음 날 종료로 표시돼요.";
  }

  if (editor.id) {
    return "삭제하면 근무자와 모든 월의 일정이 함께 삭제돼요. 삭제 직후 실행 취소로 되돌릴 수 있어요.";
  }

  return "현재 월부터 등록돼요. 모든 날짜를 휴무로 채워 이름이 빠지지 않아요.";
};

export const IdentityFields = ({ editor, onChange }: IdentityFieldsProps) => (
  <>
    <TextField
      label={editor.kind === "type" ? "근무 타입 이름" : "이름"}
      placeholder={editor.kind === "type" ? "예: 오픈" : "근무자 이름"}
      maxLength={20}
      required
      value={editor.name}
      onChange={(event) => onChange({ ...editor, name: event.target.value })}
    />
    {editor.kind === "type" && (
      <div className="flex gap-3">
        <TextField
          label="시작 시간"
          type="time"
          required
          value={editor.start}
          onChange={(event) =>
            onChange({ ...editor, start: event.target.value })
          }
        />
        <TextField
          label="종료 시간"
          type="time"
          required
          value={editor.end}
          onChange={(event) => onChange({ ...editor, end: event.target.value })}
        />
      </div>
    )}
    <fieldset className="flex flex-wrap items-center gap-2.5 border-0 p-0 max-[640px]:gap-3">
      <legend className="mb-3 text-[13px] font-medium">
        {editor.kind === "type" ? "캘린더 표시 색상" : "직원 고유 색상"}
      </legend>
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          style={{ background: color }}
          aria-label={`색상 ${color}`}
          aria-pressed={editor.color === color}
          onClick={() => onChange({ ...editor, color })}
          className="grid size-[29px] place-items-center rounded-full border-2 border-transparent text-white aria-pressed:outline-2 aria-pressed:outline-content aria-pressed:outline-offset-3"
        >
          {editor.color === color && <Glyph name="check" />}
        </button>
      ))}
      <input
        aria-label="직접 색상 선택"
        type="color"
        value={editor.color}
        onChange={(event) => onChange({ ...editor, color: event.target.value })}
        className="size-[29px] cursor-pointer border-0 bg-transparent p-0"
      />
    </fieldset>
    <p className="rounded-control bg-canvas-subtle p-3 text-[11px] leading-[1.9] text-content-tertiary">
      {identityDescription(editor)}
    </p>
  </>
);
