import { datesForWeekdays } from "./batch-assignments";
import {
  dateKey,
  daysInMonth,
  employeeStartDate,
  isEmployeeVisibleOn,
  type Employee,
} from "./schedule";

export type BatchDateSelection = {
  mode: "dates" | "weekdays";
  dates: string[];
  start: string;
  end: string;
  weekdays: number[];
};

export const availableBatchDates = (
  employees: Employee[],
  month: string,
  employeeIds: string[],
) => {
  const selected = employees.filter((employee) =>
    employeeIds.includes(employee.id),
  );

  if (!selected.length || selected.length !== new Set(employeeIds).size)
    return [];

  return Array.from({ length: daysInMonth(month) }, (_, index) =>
    dateKey(month, index + 1),
  ).filter((date) =>
    selected.every((employee) => isEmployeeVisibleOn(employee, date)),
  );
};

export const batchDateDisabledNotices = (
  employees: Employee[],
  employeeIds: string[],
  month: string,
): string[] => {
  const firstDate = dateKey(month, 1);
  const lastDate = dateKey(month, daysInMonth(month));
  const selected = employees.filter((employee) =>
    employeeIds.includes(employee.id),
  );
  const joiningNames = selected
    .filter((employee) => employeeStartDate(employee) > firstDate)
    .map((employee) => employee.name);
  const leavingNames = selected
    .filter((employee) => employee.endDate && employee.endDate < lastDate)
    .map((employee) => employee.name);
  const notices: string[] = [];

  if (joiningNames.length) {
    notices.push(
      `※ ${joiningNames.join(", ")}의 입사일 이전 날짜는 비활성화 되었습니다.`,
    );
  }

  if (leavingNames.length) {
    notices.push(
      `※ ${leavingNames.join(", ")}의 퇴사일 이후 날짜는 비활성화 되었습니다.`,
    );
  }

  return notices;
};

export const constrainBatchDateSelection = (
  selection: BatchDateSelection,
  availableDates: string[],
  month: string,
): BatchDateSelection => {
  const first = availableDates[0] ?? `${month}-01`;
  const last = availableDates.at(-1) ?? dateKey(month, daysInMonth(month));

  const clampDate = (date: string) => {
    if (!date) return date;
    if (date < first) return first;
    if (date > last) return last;

    return date;
  };

  return {
    ...selection,
    dates: selection.dates.filter((date) => availableDates.includes(date)),
    start: clampDate(selection.start),
    end: clampDate(selection.end),
  };
};

export const selectedBatchDates = (
  month: string,
  selection: BatchDateSelection,
  availableDates: string[],
) => {
  const dates =
    selection.mode === "dates"
      ? selection.dates
      : datesForWeekdays(
          month,
          selection.start,
          selection.end,
          selection.weekdays,
        );

  return dates.filter((date) => availableDates.includes(date));
};
