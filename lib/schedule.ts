export const categories = ["work", "off", "leave", "other"] as const;

export type Category = (typeof categories)[number];

export type AssignmentCounts = Record<Category, number>;

export const DEFAULT_OFF_TARGET = 8;

export type ShiftType = {
  id: string;
  name: string;
  start: string;
  end: string;
  color: string;
  archived?: boolean;
};

export type Employee = {
  id: string;
  name: string;
  color: string;
  from: string;
  position?: string;
  startDate?: string;
  endDate?: string;
  until?: string;
  legacyOffThrough?: string;
};

export type EmployeeScheduleSummary = Employee & { counts: AssignmentCounts; };

export type Assignment = {
  category: Category;
  shift?: ShiftType;
  memo?: string;
};

export type Schedule = {
  version: 3;
  storeName?: string;
  // 이전 버전 데이터를 손실 없이 저장하기 위한 호환 필드입니다. 현재 기능에서는 사용하지 않습니다.
  employeeOffTargets?: Record<string, Record<string, number | null>>;
  employees: Employee[];
  typesByMonth: Record<string, ShiftType[]>;
  entries: Record<string, Assignment>;
  targets: Record<string, number>;
};

export const labels: Record<Category, string> = {
  work: "근무",
  off: "휴무",
  leave: "연차",
  other: "기타",
};

export const colors = [
  "#E15B56",
  "#D59627",
  "#42A184",
  "#5686D6",
  "#8B6AC8",
  "#C96999",
];

export const DEFAULT_SHIFT_TYPES: ShiftType[] = [
  {
    id: "open",
    name: "오픈",
    start: "08:00",
    end: "17:00",
    color: colors[0],
  },
  {
    id: "middle",
    name: "미들",
    start: "11:00",
    end: "20:00",
    color: colors[1],
  },
  {
    id: "close",
    name: "마감",
    start: "14:00",
    end: "23:00",
    color: colors[4],
  },
];

export const initial: Schedule = {
  version: 3,
  employees: [],
  entries: {},
  targets: {},
  typesByMonth: {},
};

export const getMonthShiftTypes = (data: Pick<Schedule, "typesByMonth">, month: string): ShiftType[] =>
  data.typesByMonth[month] ?? [];

export const monthKey = (year: number, month: number) => {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
};

export const daysInMonth = (month: string) => {
  const [year, monthNumber] = month.split("-").map(Number);

  return new Date(year, monthNumber, 0).getDate();
};

export const dateKey = (month: string, day: number) => {
  return `${month}-${String(day).padStart(2, "0")}`;
};

export const isValidDate = (date: string) => {
  if (!/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(date)) return false;

  const day = Number(date.slice(8));

  return day >= 1 && day <= daysInMonth(date.slice(0, 7));
};

// Old in-memory/imported schedules only have a registration month.
export const employeeStartDate = (employee: Employee) =>
  employee.startDate ?? `${employee.from}-01`;

export const sortEmployeesByStartDate = <T extends Employee>(employees: T[]): T[] =>
  [...employees].sort((first, second) =>
    employeeStartDate(first).localeCompare(employeeStartDate(second)),
  );

export const isEmployeeVisibleOn = (employee: Employee, date: string) =>
  employeeStartDate(employee) <= date && (!employee.endDate || date <= employee.endDate);

export const employeesInMonth = <T extends Employee>(employees: T[], month: string) =>
  sortEmployeesByStartDate(
    employees.filter((employee) =>
      employeeStartDate(employee) <= dateKey(month, daysInMonth(month)) &&
      (!employee.endDate || employee.endDate >= `${month}-01`),
    ),
  );

export const getAssignment = (
  data: Pick<Schedule, "entries">,
  date: string,
  employeeId: string,
): Assignment | undefined => data.entries[`${date}:${employeeId}`];

export const assign = (
  data: Schedule,
  date: string,
  employeeId: string,
  assignment: Assignment,
): Schedule => {
  const entries = { ...data.entries };

  entries[`${date}:${employeeId}`] = structuredClone(assignment);

  return { ...data, entries };
};

export const counts = (
  data: Pick<Schedule, "entries"> & Partial<Pick<Schedule, "employees">>,
  month: string,
  employeeId: string,
): AssignmentCounts => {
  const result: AssignmentCounts = { work: 0, off: 0, leave: 0, other: 0 };
  const totalDays = daysInMonth(month);
  const employee = data.employees?.find((item) => item.id === employeeId);

  for (let day = 1; day <= totalDays; day++) {
    const date = dateKey(month, day);

    if (employee && !isEmployeeVisibleOn(employee, date)) continue;

    const assignment = getAssignment(data, date, employeeId);
    if (assignment) result[assignment.category]++;
  }

  return result;
};

const nonWorkColors = {
  off: "#A58C73",
  leave: "#638C94",
  other: "#949564",
};

export const assignmentLabel = (assignment: Assignment) => {
  if (assignment.category === "work") return assignment.shift?.name ?? labels.work;

  return labels[assignment.category];
};

export const assignmentColor = (assignment: Assignment) => {
  if (assignment.category === "work") {
    return assignment.shift?.color ?? "#5686D6";
  }

  return nonWorkColors[assignment.category];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isValidColor = (value: unknown) =>
  typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);

const isValidShiftType = (value: unknown): value is ShiftType => {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    isValidColor(value.color) &&
    typeof value.start === "string" &&
    typeof value.end === "string" &&
    /^\d{2}:\d{2}$/.test(value.start) &&
    /^\d{2}:\d{2}$/.test(value.end)
  );
};

const isValidEmployee = (value: unknown): value is Employee => {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    (value.position === undefined || (typeof value.position === "string" && value.position.length <= 30)) &&
    isValidColor(value.color) &&
    typeof value.from === "string" &&
    /^\d{4}-\d{2}$/.test(value.from) &&
    (value.startDate === undefined || (typeof value.startDate === "string" && isValidDate(value.startDate))) &&
    (value.endDate === undefined ||
      (typeof value.endDate === "string" && isValidDate(value.endDate) &&
        value.endDate >= (value.startDate ?? `${value.from}-01`))) &&
    (value.legacyOffThrough === undefined ||
      (typeof value.legacyOffThrough === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value.legacyOffThrough)))
  );
};

const isValidAssignment = (value: unknown): value is Assignment => {
  if (!isRecord(value) || !Object.hasOwn(labels, String(value.category))) {
    return false;
  }

  if (value.memo !== undefined && typeof value.memo !== "string") return false;

  return value.category !== "work" || isValidShiftType(value.shift);
};

// Only assignments in this month follow that month's active type definitions.
export const syncAssignmentShiftTypes = (data: Schedule, month: string): Schedule => {
  const activeTypes = new Map(
    getMonthShiftTypes(data, month).filter((type) => !type.archived).map((type) => [type.id, type]),
  );
  const entries = { ...data.entries };

  for (const [key, assignment] of Object.entries(entries)) {
    if (!key.startsWith(`${month}-`) || assignment.category !== "work" || !assignment.shift) continue;

    const currentType = activeTypes.get(assignment.shift.id);

    if (!currentType) continue;

    const previousType = assignment.shift;
    const hasChanges = previousType.name !== currentType.name ||
      previousType.start !== currentType.start ||
      previousType.end !== currentType.end ||
      previousType.color !== currentType.color;

    if (hasChanges) entries[key] = { ...assignment, shift: { ...currentType } };
  }

  return { ...data, entries };
};

const isValidMonth = (value: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(value);

const isValidEmployeeOffTargets = (value: unknown, employees: Employee[]) => {
  if (!isRecord(value)) return false;

  const employeeIds = new Set(employees.map((employee) => employee.id));

  return Object.entries(value).every(([month, targets]) => {
    if (!isValidMonth(month) || !isRecord(targets)) return false;

    return Object.entries(targets).every(([id, target]) => employeeIds.has(id) &&
      (target === null || (typeof target === "number" && Number.isInteger(target) && target >= 0 && target <= daysInMonth(month))),
    );
  });
};

export const readSaved = (raw: string, currentMonth = monthKey(new Date().getFullYear(), new Date().getMonth())): Schedule => {
  const saved: unknown = JSON.parse(raw);

  if (
    !isRecord(saved) || (saved.version !== 1 && saved.version !== 2 && saved.version !== 3) ||
    !Array.isArray(saved.employees) || !saved.employees.every(isValidEmployee) ||
    !isRecord(saved.entries) || !Object.values(saved.entries).every((value) =>
      isValidAssignment(value) || (isRecord(value) && value.category === "unassigned"),
    ) ||
    !isRecord(saved.targets)
  ) {
    throw new Error("저장 형식을 확인해 주세요.");
  }

  if (!Object.entries(saved.targets).every(([month, target]) =>
    isValidMonth(month) && typeof target === "number" && Number.isInteger(target) && target >= 0 && target <= 31,
  )) throw new Error("휴무 기준이 올바르지 않아요.");

  if (saved.storeName !== undefined && (typeof saved.storeName !== "string" || saved.storeName.length > 80)) {
    throw new Error("매장 이름은 80자 이내로 입력해 주세요.");
  }
  if (saved.employeeOffTargets !== undefined && !isValidEmployeeOffTargets(saved.employeeOffTargets, saved.employees as Employee[])) {
    throw new Error("근무자별 휴무 기준을 확인해 주세요.");
  }

  // 이전 저장본의 미배정 행은 빈 날짜로 전환하며 실제 배정은 보존합니다.
  const entries = Object.fromEntries(Object.entries(saved.entries).filter(([, value]) =>
    !(isRecord(value) && value.category === "unassigned"),
  )) as Record<string, Assignment>;

  if (saved.version === 3) {
    if (!isRecord(saved.typesByMonth) || !Object.entries(saved.typesByMonth).every(([month, types]) =>
      isValidMonth(month) && Array.isArray(types) && types.every(isValidShiftType) &&
      new Set(types.map((type) => type.id)).size === types.length,
    )) throw new Error("월별 근무 타입을 읽지 못했어요.");

    return { ...saved, entries } as unknown as Schedule;
  }

  if (!Array.isArray(saved.types) || !saved.types.every(isValidShiftType)) {
    throw new Error("저장된 근무 타입을 읽지 못했어요.");
  }

  const employees = saved.employees as Employee[];
  const targets = saved.targets as Record<string, number>;
  const months = [...new Set([
    currentMonth,
    ...employees.map((employee) => employee.from),
    ...Object.keys(targets),
    ...Object.keys(entries).map((key) => key.slice(0, 7)),
  ])].filter(isValidMonth).sort();

  // Preserve recorded assignment snapshots; migration must not rewrite past shifts.
  return {
    version: 3,
    employees,
    entries,
    targets,
    typesByMonth: Object.fromEntries(months.map((month) => [month, structuredClone(saved.types as ShiftType[])])),
  };
};
