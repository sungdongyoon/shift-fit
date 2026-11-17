"use client";

import { Select } from "@/components/ui/select";
import { AssignmentOptions } from "./assignment-options";
import { useEmployees, useShiftTypes } from "@/hooks/use-month-schedule";
import type { AssignmentEditor, Editor } from "@/lib/editor";
import {
  getAssignment,
  isEmployeeVisibleOn,
} from "@/lib/schedule";
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
  const existing = getAssignment(
    { entries },
    editor.date,
    editor.employee,
  );
  const assignedShift = existing?.shift;
  const hasDeletedShift = Boolean(
    assignedShift && !types.some((type) => type.id === assignedShift.id),
  );
  const selectableTypes =
    hasDeletedShift && assignedShift ? [...types, assignedShift] : types;

  return (
    <>
      <div className="text-[14px] font-semibold">
        {editor.date.replaceAll("-", ". ")}
      </div>
      {editor.original ? (
        <div className="flex flex-col gap-2 text-[13px] font-medium">
          {/* <span>근무자</span> */}
          <p className="text-lg text-content font-semibold">
            {
              employees.find((employee) => employee.id === editor.employee)
                ?.name
            }
          </p>
        </div>
      ) : (
        <Select
          label="근무자"
          value={editor.employee}
          onChange={(event) =>
            onChange({ ...editor, employee: event.target.value })
          }
          options={employees
            .filter((employee) => isEmployeeVisibleOn(employee, editor.date) &&
              !getAssignment({ entries }, editor.date, employee.id),
            )
            .map((employee) => ({ value: employee.id, label: employee.name }))}
        />
      )}
      <AssignmentOptions
        value={editor}
        onChange={(value) => onChange({ ...editor, ...value })}
        types={selectableTypes}
        deletedTypeId={hasDeletedShift ? assignedShift?.id : undefined}
      />
    </>
  );
};
