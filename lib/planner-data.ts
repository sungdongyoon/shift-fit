import {
  DEFAULT_OFF_TARGET,
  daysInMonth,
  initial,
  readSaved,
  type Category,
  type Schedule,
  type ShiftType,
} from "./schedule";

type EmployeeRow = {
  id: string;
  name: string;
  color: string;
  registered_month: string;
  sort_order: number;
};
type MonthRow = { month: string; off_target: number };
type TypeRow = {
  id: string;
  month: string;
  name: string;
  start_time: string;
  end_time: string;
  color: string;
  archived: boolean;
  sort_order: number;
};
type AssignmentRow = {
  employee_id: string;
  work_date: string;
  category: Category;
  shift_type_id: string | null;
  memo: string | null;
};

export type PlannerPayload = {
  employees: EmployeeRow[];
  months: MonthRow[];
  types: TypeRow[];
  assignments: AssignmentRow[];
};

export type PlannerSnapshot = { data: Schedule; revision: number };

export type PlannerResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; conflict?: boolean };

export type PlannerPersistence = {
  load: () => Promise<PlannerResult<PlannerSnapshot>>;
  save: (
    data: Schedule,
    revision: number,
    baseline: Schedule,
  ) => Promise<PlannerResult<number>>;
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

const requireValue = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

export const toPlannerPayload = (input: unknown): PlannerPayload => {
  requireValue(
    typeof input === "object" &&
      input !== null &&
      "version" in input &&
      input.version === 3,
    "근무표 형식을 확인해 주세요.",
  );
  const data = readSaved(JSON.stringify(input), "2000-01");
  const typeIds = new Set<string>();
  const employeeIds = new Set<string>();
  const months = new Set([
    ...Object.keys(data.typesByMonth),
    ...Object.keys(data.targets),
  ]);
  const payload: PlannerPayload = {
    employees: [],
    months: [],
    types: [],
    assignments: [],
  };

  data.employees.forEach((employee, sort_order) => {
    requireValue(
      uuid.test(employee.id) && !employeeIds.has(employee.id),
      "근무자 ID를 확인해 주세요.",
    );
    requireValue(
      employee.name.trim().length > 0 && employee.name.length <= 80,
      "근무자 이름은 1~80자로 입력해 주세요.",
    );
    requireValue(
      monthPattern.test(employee.from),
      "근무자 등록 월을 확인해 주세요.",
    );
    employeeIds.add(employee.id);
    payload.employees.push({
      id: employee.id,
      name: employee.name.trim(),
      color: employee.color,
      registered_month: `${employee.from}-01`,
      sort_order,
    });
  });

  Object.entries(data.typesByMonth).forEach(([month, types]) => {
    requireValue(monthPattern.test(month), "근무표 월을 확인해 주세요.");
    types.forEach((type, sort_order) => {
      requireValue(
        uuid.test(type.id) && !typeIds.has(type.id),
        "근무 타입 ID를 확인해 주세요.",
      );
      requireValue(
        type.name.trim().length > 0 && type.name.length <= 80,
        "근무 타입 이름은 1~80자로 입력해 주세요.",
      );
      requireValue(
        timePattern.test(type.start) &&
          timePattern.test(type.end) &&
          type.start !== type.end,
        "근무 시간을 확인해 주세요.",
      );
      typeIds.add(type.id);
      payload.types.push({
        id: type.id,
        month: `${month}-01`,
        name: type.name.trim(),
        start_time: type.start,
        end_time: type.end,
        color: type.color,
        archived: Boolean(type.archived),
        sort_order,
      });
    });
  });

  Object.entries(data.entries).forEach(([key, assignment]) => {
    const date = key.slice(0, 10);
    const employeeId = key.slice(11);
    const month = date.slice(0, 7);
    requireValue(
      key[10] === ":" && employeeIds.has(employeeId),
      "일정의 근무자를 확인해 주세요.",
    );
    requireValue(
      /^\d{4}-\d{2}-\d{2}$/.test(date) &&
        Number.isFinite(Date.parse(`${date}T00:00:00Z`)) &&
        new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date,
      "일정 날짜를 확인해 주세요.",
    );
    const shiftId =
      assignment.category === "work" ? assignment.shift?.id : null;
    requireValue(
      assignment.category !== "work" ||
        Boolean(
          shiftId &&
            data.typesByMonth[month]?.some((type) => type.id === shiftId),
        ),
      "해당 월의 근무 타입을 선택해 주세요.",
    );
    const memo =
      assignment.category === "other"
        ? (assignment.memo?.trim() ?? null)
        : null;
    requireValue(
      !memo || memo.length <= 200,
      "기타 메모는 200자 이내로 입력해 주세요.",
    );
    months.add(month);
    payload.assignments.push({
      employee_id: employeeId,
      work_date: date,
      category: assignment.category,
      shift_type_id: shiftId ?? null,
      memo,
    });
  });

  [...months].sort().forEach((month) => {
    const target = data.targets[month] ?? DEFAULT_OFF_TARGET;
    requireValue(
      monthPattern.test(month) && target >= 0 && target <= daysInMonth(month),
      "월 휴무 기준을 확인해 주세요.",
    );
    payload.months.push({ month: `${month}-01`, off_target: target });
  });

  return payload;
};

export const fromPlannerRows = (input: unknown): PlannerSnapshot => {
  if (!input || typeof input !== "object")
    throw new Error("근무표 응답을 읽지 못했어요.");
  const rows = input as PlannerPayload & { revision: number };
  requireValue(
    Number.isSafeInteger(rows.revision) &&
      rows.revision >= 0 &&
      [rows.employees, rows.months, rows.types, rows.assignments].every(
        Array.isArray,
      ),
    "근무표 응답 형식을 확인해 주세요.",
  );
  const data = structuredClone(initial);
  const types = new Map<string, ShiftType>();
  data.employees = rows.employees.map((employee) => ({
    id: employee.id,
    name: employee.name,
    color: employee.color,
    from: employee.registered_month.slice(0, 7),
  }));
  rows.months.forEach((row) => {
    const month = row.month.slice(0, 7);
    data.targets[month] = row.off_target;
    data.typesByMonth[month] = [];
  });
  rows.types.forEach((row) => {
    const type: ShiftType = {
      id: row.id,
      name: row.name,
      start: row.start_time.slice(0, 5),
      end: row.end_time.slice(0, 5),
      color: row.color,
      ...(row.archived ? { archived: true } : {}),
    };
    types.set(row.id, type);
    (data.typesByMonth[row.month.slice(0, 7)] ??= []).push(type);
  });
  rows.assignments.forEach((row) => {
    const shift = row.shift_type_id ? types.get(row.shift_type_id) : undefined;
    data.entries[`${row.work_date}:${row.employee_id}`] = {
      category: row.category,
      ...(shift ? { shift } : {}),
      ...(row.category === "other" && row.memo ? { memo: row.memo } : {}),
    };
  });
  toPlannerPayload(data);

  return { data, revision: rows.revision };
};

export type PlannerChanges = PlannerPayload & {
  deleted_employees: string[];
  deleted_types: string[];
  deleted_months: string[];
  deleted_assignments: Array<{ employee_id: string; work_date: string }>;
};

export const buildPlannerChanges = (
  data: Schedule,
  baseline: Schedule,
): PlannerChanges => {
  const next = toPlannerPayload(data);
  const previous = toPlannerPayload(baseline);
  const changed = <T>(rows: T[], oldRows: T[], key: (row: T) => string) => {
    const old = new Map(oldRows.map((row) => [key(row), JSON.stringify(row)]));

    return rows.filter((row) => old.get(key(row)) !== JSON.stringify(row));
  };
  const removed = <T>(rows: T[], oldRows: T[], key: (row: T) => string) => {
    const current = new Set(rows.map(key));

    return oldRows.filter((row) => !current.has(key(row)));
  };
  const assignmentKey = (row: AssignmentRow) =>
    `${row.work_date}:${row.employee_id}`;

  return {
    employees: changed(next.employees, previous.employees, (row) => row.id),
    months: changed(next.months, previous.months, (row) => row.month),
    types: changed(next.types, previous.types, (row) => row.id),
    assignments: changed(next.assignments, previous.assignments, assignmentKey),
    deleted_employees: removed(
      next.employees,
      previous.employees,
      (row) => row.id,
    ).map((row) => row.id),
    deleted_types: removed(next.types, previous.types, (row) => row.id).map(
      (row) => row.id,
    ),
    deleted_months: removed(
      next.months,
      previous.months,
      (row) => row.month,
    ).map((row) => row.month),
    deleted_assignments: removed(
      next.assignments,
      previous.assignments,
      assignmentKey,
    ).map(({ employee_id, work_date }) => ({ employee_id, work_date })),
  };
};

// PostgreSQL checks field constraints, same-store/month references, and ownership in one transaction.
export const parsePlannerChanges = (input: unknown): PlannerChanges => {
  requireValue(
    typeof input === "object" && input !== null && !Array.isArray(input),
    "저장할 변경사항을 확인해 주세요.",
  );
  const changes = input as PlannerChanges;
  const keys = [
    "employees",
    "months",
    "types",
    "assignments",
    "deleted_employees",
    "deleted_types",
    "deleted_months",
    "deleted_assignments",
  ] as const;
  keys.forEach((key) =>
    requireValue(
      Array.isArray(changes[key]),
      "저장할 변경사항 형식을 확인해 주세요.",
    ),
  );
  [changes.deleted_employees, changes.deleted_types]
    .flat()
    .forEach((id) =>
      requireValue(
        typeof id === "string" && uuid.test(id),
        "삭제할 항목의 ID를 확인해 주세요.",
      ),
    );

  return Object.fromEntries(
    keys.map((key) => [key, changes[key]]),
  ) as PlannerChanges;
};
