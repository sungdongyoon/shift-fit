export const categories = ["work", "off", "leave", "other", "unassigned"] as const;

export type Category = (typeof categories)[number];

export type AssignmentCounts = Record<Category, number>;

export const DEFAULT_OFF_TARGET = 8;

export const DEFAULT_OFF_ASSIGNMENT: Assignment = Object.freeze({ category: "off" });

export const DEFAULT_UNASSIGNED: Assignment = Object.freeze({ category: "unassigned" });

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
  version: 2;
  employees: Employee[];
  types: ShiftType[];
  entries: Record<string, Assignment>;
  targets: Record<string, number>;
};

export const labels: Record<Category, string> = {
  work: "근무",
  off: "휴무",
  leave: "연차",
  other: "기타",
  unassigned: "미배정",
};

export const colors = [
  "#E15B56",
  "#D59627",
  "#42A184",
  "#5686D6",
  "#8B6AC8",
  "#C96999",
];

export const initial: Schedule = {
  version: 2,
  employees: [],
  entries: {},
  targets: {},
  types: [
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
  ],
};

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

export const activeEmployees = (
  data: Pick<Schedule, "employees">,
  month: string,
) => {
  return data.employees.filter(
    (employee) =>
      employee.from <= month && (!employee.until || employee.until >= month),
  );
};

export const defaultAssignment = (employee: Employee | undefined, date: string): Assignment => {
  if (employee?.legacyOffThrough && date.slice(0, 7) <= employee.legacyOffThrough) {
    return DEFAULT_OFF_ASSIGNMENT;
  }

  return DEFAULT_UNASSIGNED;
};

export const getAssignment = (
  data: Pick<Schedule, "entries"> & Partial<Pick<Schedule, "employees">>,
  date: string,
  employeeId: string,
): Assignment => {
  const saved = data.entries[`${date}:${employeeId}`];

  if (saved) return saved;

  return defaultAssignment(data.employees?.find((employee) => employee.id === employeeId), date);
};

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
  const result: AssignmentCounts = { work: 0, off: 0, leave: 0, other: 0, unassigned: 0 };
  const totalDays = daysInMonth(month);

  for (let day = 1; day <= totalDays; day++) {
    const assignment = getAssignment(data, dateKey(month, day), employeeId);
    result[assignment.category]++;
  }

  return result;
};

const nonWorkColors = {
  unassigned: "#CBD5E1",
  off: "#A3A6AE",
  leave: "#42A184",
  other: "#8B6AC8",
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
    isValidColor(value.color) &&
    typeof value.from === "string" &&
    /^\d{4}-\d{2}$/.test(value.from) &&
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

// Active types are shared definitions; archived or missing types retain their saved details.
export const syncAssignmentShiftTypes = (data: Schedule): Schedule => {
  const activeTypes = new Map(
    data.types.filter((type) => !type.archived).map((type) => [type.id, type]),
  );
  const entries = { ...data.entries };

  for (const [key, assignment] of Object.entries(entries)) {
    if (assignment.category !== "work" || !assignment.shift) continue;

    const currentType = activeTypes.get(assignment.shift.id);

    if (!currentType) continue;

    const previousType = assignment.shift;
    const hasChanges = previousType.name !== currentType.name ||
      previousType.start !== currentType.start ||
      previousType.end !== currentType.end ||
      previousType.color !== currentType.color;

    if (hasChanges) {
      entries[key] = { ...assignment, shift: { ...currentType } };
    }
  }

  return { ...data, entries };
};

export const readSaved = (raw: string, currentMonth = monthKey(new Date().getFullYear(), new Date().getMonth())): Schedule => {
  const saved: unknown = JSON.parse(raw);

  if (
    !isRecord(saved) ||
    (saved.version !== 1 && saved.version !== 2) ||
    !Array.isArray(saved.employees) ||
    !Array.isArray(saved.types) ||
    !isRecord(saved.entries) ||
    !isRecord(saved.targets)
  ) {
    throw new Error("저장 형식을 확인해 주세요.");
  }

  if (!saved.types.every(isValidShiftType) || !saved.employees.every(isValidEmployee)) {
    throw new Error("저장된 직원 정보를 읽지 못했어요.");
  }

  if (!Object.values(saved.entries).every(isValidAssignment)) {
    throw new Error("저장된 배정을 읽지 못했어요.");
  }

  const validTargets = Object.values(saved.targets).every(
    (target) => typeof target === "number" && Number.isInteger(target) && target >= 0 && target <= 31,
  );

  if (!validTargets) {
    throw new Error("휴무 기준이 올바르지 않아요.");
  }

  const data = saved as unknown as Schedule;

  if (saved.version === 1) {
    // v1 omitted explicit days off. Preserve that interpretation through the latest
    // recorded month; later months and newly added employees start unassigned.
    const lastLegacyMonth = [
      currentMonth,
      ...data.employees.map((employee) => employee.from),
      ...Object.keys(data.targets),
      ...Object.keys(data.entries).map((key) => key.slice(0, 7)),
    ].sort().at(-1)!;

    return syncAssignmentShiftTypes({
      ...data,
      version: 2,
      employees: data.employees.map((employee) => ({ ...employee, legacyOffThrough: lastLegacyMonth })),
    });
  }

  return syncAssignmentShiftTypes(data);
};
