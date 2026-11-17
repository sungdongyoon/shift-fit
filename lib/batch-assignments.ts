import {
  categories,
  dateKey,
  daysInMonth,
  getAssignment,
  getMonthShiftTypes,
  isEmployeeVisibleOn,
  isValidDate,
  type Assignment,
  type Category,
  type Schedule,
} from "./schedule";

export type BatchAssignmentRequest = {
  month: string;
  employeeIds: string[];
  dates: string[];
  category: Category;
  typeId: string;
  memo?: string;
};

export type BatchAssignmentContext = {
  month: string;
  date?: string;
  employeeIds: string[];
};

type BatchAssignmentPlan = {
  additions: Array<{ key: string; assignment: Assignment }>;
  existingCount: number;
  outsideEmploymentCount: number;
};

export type BatchAssignmentResult =
  { ok: true; plan: BatchAssignmentPlan } | { ok: false; error: string };

export const datesForWeekdays = (
  month: string,
  start: string,
  end: string,
  weekdays: number[],
): string[] => {
  if (
    !isValidDate(start) ||
    !isValidDate(end) ||
    start > end ||
    start.slice(0, 7) !== month ||
    end.slice(0, 7) !== month
  )
    return [];

  return Array.from({ length: daysInMonth(month) }, (_, index) =>
    dateKey(month, index + 1),
  ).filter(
    (date) =>
      date >= start &&
      date <= end &&
      weekdays.includes(new Date(`${date}T00:00:00Z`).getUTCDay()),
  );
};

export const planBatchAssignments = (
  data: Schedule,
  request: BatchAssignmentRequest,
): BatchAssignmentResult => {
  const employeeIds = [...new Set(request.employeeIds)];
  const dates = [...new Set(request.dates)].sort();

  if (!employeeIds.length)
    return { ok: false, error: "근무자를 한 명 이상 선택해 주세요." };
  if (!dates.length)
    return { ok: false, error: "날짜를 한 개 이상 선택해 주세요." };
  if (
    dates.some(
      (date) => !isValidDate(date) || date.slice(0, 7) !== request.month,
    )
  ) {
    return { ok: false, error: "현재 월 안에서 올바른 날짜를 선택해 주세요." };
  }
  if (!categories.includes(request.category))
    return { ok: false, error: "일정 종류를 선택해 주세요." };

  const employees = employeeIds.map((id) =>
    data.employees.find((employee) => employee.id === id),
  );
  if (employees.some((employee) => !employee))
    return { ok: false, error: "선택한 근무자 정보를 다시 확인해 주세요." };

  const shift = getMonthShiftTypes(data, request.month).find(
    (type) => !type.archived && type.id === request.typeId,
  );
  if (request.category === "work" && !shift)
    return { ok: false, error: "이 달의 근무 타입을 선택해 주세요." };

  const memo = request.memo?.replace(/\s+/g, " ").trim();
  if (request.category === "other" && memo && memo.length > 200) {
    return { ok: false, error: "기타 메모는 200자 이내로 입력해 주세요." };
  }

  const assignment: Assignment = {
    category: request.category,
    ...(request.category === "work" ? { shift } : {}),
    ...(request.category === "other" && memo ? { memo } : {}),
  };
  const plan: BatchAssignmentPlan = {
    additions: [],
    existingCount: 0,
    outsideEmploymentCount: 0,
  };

  for (const date of dates) {
    for (const employee of employees) {
      if (!employee) continue;
      if (!isEmployeeVisibleOn(employee, date)) {
        plan.outsideEmploymentCount++;
        continue;
      }
      if (getAssignment(data, date, employee.id)) {
        plan.existingCount++;
        continue;
      }
      plan.additions.push({ key: `${date}:${employee.id}`, assignment });
    }
  }

  return { ok: true, plan };
};

export const applyBatchAssignments = (
  data: Schedule,
  plan: BatchAssignmentPlan,
): Schedule => ({
  ...data,
  entries: {
    ...data.entries,
    ...Object.fromEntries(
      plan.additions.map(({ key, assignment }) => [
        key,
        structuredClone(assignment),
      ]),
    ),
  },
});
