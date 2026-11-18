"use client";

import { useReducer, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  planBatchAssignments,
  type BatchAssignmentContext,
} from "@/lib/batch-assignments";
import {
  daysInMonth,
  employeesInMonth,
  getAssignment,
  getMonthShiftTypes,
  isEmployeeVisibleOn,
  type Category,
} from "@/lib/schedule";
import { usePlannerStore } from "@/providers/planner-provider";
import { AssignmentOptions } from "./assignment-options";
import { BatchDatePicker } from "./batch-date-picker";
import {
  availableBatchDates,
  batchDateDisabledNotices,
  constrainBatchDateSelection,
  selectedBatchDates,
  type BatchDateSelection,
} from "@/lib/batch-date-selection";
import { EmployeeCheckboxList } from "./employee-checkbox-list";

type BatchFormState = {
  employeeIds: string[];
  selection: BatchDateSelection;
  category: Category;
  typeId: string;
  memo: string;
  error: string;
};

const updateBatchForm = (
  state: BatchFormState,
  patch: Partial<BatchFormState>,
): BatchFormState => ({
  ...state,
  ...patch,
  error: patch.error ?? "",
});

const BatchAssignmentForm = ({
  context,
}: {
  context: BatchAssignmentContext;
}) => {
  const data = usePlannerStore((state) => state.data);
  const save = usePlannerStore((state) => state.saveBatchAssignment);
  const close = usePlannerStore((state) => state.closeBatchAssignment);

  const types = getMonthShiftTypes(data, context.month).filter(
    (type) => !type.archived,
  );

  const [draft, update] = useReducer(updateBatchForm, {
    employeeIds: context.employeeIds,
    selection: {
      mode: "dates",
      dates: context.date ? [context.date] : [],
      start: `${context.month}-01`,
      end: `${context.month}-${daysInMonth(context.month)}`,
      weekdays: [],
    },
    category: "work",
    typeId: types[0]?.id ?? "",
    memo: "",
    error: "",
  });

  const date = context.date;
  const employees = date
    ? data.employees.filter(
        (employee) =>
          isEmployeeVisibleOn(employee, date) &&
          !getAssignment(data, date, employee.id),
      )
    : employeesInMonth(data.employees, context.month);
  const availableDates = availableBatchDates(
    data.employees,
    context.month,
    draft.employeeIds,
  );
  const selection = constrainBatchDateSelection(
    draft.selection,
    availableDates,
    context.month,
  );
  const dates = context.date
    ? [context.date]
    : selectedBatchDates(context.month, selection, availableDates);
  const request = {
    month: context.month,
    employeeIds: draft.employeeIds,
    dates,
    category: draft.category,
    typeId: draft.typeId,
    memo: draft.memo,
  };
  const invalidRange =
    selection.mode === "weekdays" && selection.start > selection.end;
  const preview = invalidRange
    ? { ok: false as const, error: "종료일은 시작일보다 빠를 수 없어요." }
    : planBatchAssignments(data, request);
  const additions = preview.ok ? preview.plan.additions.length : 0;

  const changeEmployees = (employeeIds: string[]) => {
    const nextAvailableDates = availableBatchDates(
      data.employees,
      context.month,
      employeeIds,
    );
    update({
      employeeIds,
      selection: constrainBatchDateSelection(
        draft.selection,
        nextAvailableDates,
        context.month,
      ),
    });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const error = save(request);
    if (error) update({ error });
  };

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-5 [&_input]:text-xs [&_select]:text-xs"
    >
      {context.date && (
        <p className="text-sm font-semibold">
          {context.date.replaceAll("-", ". ")}
        </p>
      )}
      <EmployeeCheckboxList
        employees={employees}
        selected={draft.employeeIds}
        onChange={changeEmployees}
      />
      {!context.date && (
        <BatchDatePicker
          month={context.month}
          value={selection}
          availableDates={availableDates}
          disabledNotices={batchDateDisabledNotices(
            data.employees,
            draft.employeeIds,
            context.month,
          )}
          onChange={(selection) => update({ selection })}
        />
      )}
      <AssignmentOptions
        value={{
          category: draft.category,
          typeId: draft.typeId,
          memo: draft.memo,
        }}
        onChange={(value) => update(value)}
        types={types}
      />
      {draft.error && (
        <p role="alert" className="text-xs text-danger">
          {draft.error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button
          appearance="outline"
          size="sm"
          onClick={close}
          className="text-xs"
        >
          취소
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={!preview.ok || !additions}
          className="text-xs"
        >
          {additions}건 추가
        </Button>
      </div>
    </form>
  );
};

export const BatchAssignmentDialog = () => {
  const context = usePlannerStore((state) => state.batchAssignment);
  const close = usePlannerStore((state) => state.closeBatchAssignment);

  return (
    <Dialog
      open={!!context}
      onOpenChange={(open) => {
        if (!open) close();
      }}
      title={context?.date ? "근무자 추가" : "일괄 배정"}
      className="max-w-[560px] p-6 [&_h2]:text-base"
      footer={<></>}
    >
      {context && (
        <BatchAssignmentForm
          key={`${context.month}:${context.date ?? "month"}`}
          context={context}
        />
      )}
    </Dialog>
  );
};
