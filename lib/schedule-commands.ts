import {
  type AssignmentEditor,
  type Editor,
  type EmployeeEditor,
  type ShiftTypeEditor,
} from "./editor";
import {
  assign,
  colors,
  dateKey,
  daysInMonth,
  DEFAULT_OFF_TARGET,
  getAssignment,
  DEFAULT_SHIFT_TYPES,
  getMonthShiftTypes,
  monthKey,
  syncAssignmentShiftTypes,
  type Employee,
  type Schedule,
  type ShiftType,
} from "./schedule";

type CommandResult =
  | { ok: true; data: Schedule; message: string; }
  | { ok: false; error: string; };

type CreateId = () => string;

const saveShiftType = (
  data: Schedule,
  month: string,
  editor: ShiftTypeEditor,
  createId: CreateId,
): CommandResult => {
  const name = editor.name.trim();
  const monthTypes = getMonthShiftTypes(data, month);
  const hasDuplicateName = monthTypes.some(
    (type) => !type.archived && type.id !== editor.id && type.name === name,
  );

  if (!name) {
    return { ok: false, error: "근무 타입 이름을 입력해 주세요." };
  }

  if (editor.start === editor.end) {
    return { ok: false, error: "시작과 종료 시간을 다르게 설정해 주세요." };
  }

  if (hasDuplicateName) {
    return { ok: false, error: "같은 이름의 근무 타입이 있어요." };
  }

  if (editor.id && !monthTypes.some((type) => type.id === editor.id && !type.archived)) {
    return { ok: false, error: "이 달의 근무 타입을 다시 선택해 주세요." };
  }

  const shiftType: ShiftType = {
    id: editor.id ?? createId(),
    name,
    start: editor.start,
    end: editor.end,
    color: editor.color,
  };
  const types = editor.id
    ? monthTypes.map((type) => (type.id === editor.id ? shiftType : type))
    : [...monthTypes, shiftType];

  return {
    ok: true,
    data: syncAssignmentShiftTypes({ ...data, typesByMonth: { ...data.typesByMonth, [month]: types } }, month),
    message: editor.id
      ? "이 달의 근무 타입과 기존 배정에 반영했어요."
      : "새 근무 타입을 추가했어요.",
  };
};

const saveEmployee = (
  data: Schedule,
  month: string,
  editor: EmployeeEditor,
  createId: CreateId,
): CommandResult => {
  const name = editor.name.trim();
  const hasDuplicateName = data.employees.some(
    (employee) => employee.id !== editor.id && employee.name === name,
  );

  if (!name) {
    return { ok: false, error: "근무자 이름을 입력해 주세요." };
  }

  if (hasDuplicateName) {
    return {
      ok: false,
      error: "같은 이름의 근무자가 있어요. 구분할 수 있는 이름을 입력해 주세요.",
    };
  }

  const employee: Employee = {
    id: editor.id ?? createId(),
    name,
    color: editor.color,
    from: month,
  };
  const employees = editor.id
    ? data.employees.map((item) => (
      item.id === editor.id ? { ...item, name, color: editor.color } : item
    ))
    : [...data.employees, employee];

  return {
    ok: true,
    data: { ...data, employees },
    message: editor.id
      ? "근무자 정보를 수정했어요."
      : "근무자를 추가했어요. 모든 월에 표시되고, 일정은 미배정으로 시작해요.",
  };
};

const saveAssignment = (
  data: Schedule,
  month: string,
  editor: AssignmentEditor,
): CommandResult => {
  if (editor.date.slice(0, 7) !== month) {
    return { ok: false, error: "선택한 월의 일정을 다시 열어 주세요." };
  }

  const hasEmployee = data.employees.some(
    (employee) => employee.id === editor.employee,
  );

  if (!hasEmployee) {
    return { ok: false, error: "배정할 근무자를 선택해 주세요." };
  }

  const currentShift = getAssignment(data, editor.date, editor.employee).shift;
  const activeShift = getMonthShiftTypes(data, month).find((type) => !type.archived && type.id === editor.typeId);
  // Only this employee's existing assignment can retain a deleted type.
  const shift = activeShift ?? (currentShift?.id === editor.typeId ? currentShift : undefined);

  if (editor.category === "work" && !shift) {
    return { ok: false, error: "근무 타입을 선택해 주세요." };
  }

  const memo = editor.memo?.replace(/\s+/g, " ").trim();

  return {
    ok: true,
    data: assign(data, editor.date, editor.employee, {
      category: editor.category,
      ...(editor.category === "work" ? { shift } : {}),
      ...(editor.category === "other" && memo ? { memo } : {}),
    }),
    message: "배정을 저장했어요.",
  };
};

export const saveScheduleEditor = (
  data: Schedule,
  month: string,
  editor: Editor,
  createId: CreateId = () => crypto.randomUUID(),
): CommandResult => {
  switch (editor.kind) {
    case "type":
      return saveShiftType(data, month, editor, createId);
    case "employee":
      return saveEmployee(data, month, editor, createId);
    case "assignment":
      return saveAssignment(data, month, editor);
  }
};

export const removeScheduleEditor = (
  data: Schedule,
  month: string,
  editor: Editor,
) => {
  if (editor.kind === "assignment") {
    return {
      data: assign(data, editor.date, editor.employee, { category: "off" }),
      message: "배정을 삭제하고 휴무로 변경했어요.",
    };
  }

  if (editor.kind === "type") {
    return {
      data: {
        ...data,
        typesByMonth: {
          ...data.typesByMonth,
          [month]: getMonthShiftTypes(data, month).map((type) =>
            type.id === editor.id ? { ...type, archived: true } : type,
          ),
        },
      },
      message: "근무 타입을 삭제했어요. 기존 배정은 유지돼요.",
    };
  }

  const employees = data.employees.filter((employee) => employee.id !== editor.id);
  const entries = Object.fromEntries(
    Object.entries(data.entries).filter(([key]) => !key.endsWith(`:${editor.id}`)),
  );

  return {
    data: { ...data, employees, entries },
    message: "근무자와 연결된 일정을 삭제했어요.",
  };
};

export const createExampleSchedule = (
  data: Schedule,
  month: string,
): Schedule => {
  if (data.employees.length) return data;

  const totalDays = daysInMonth(month);
  const offTarget = Math.min(data.targets[month] ?? DEFAULT_OFF_TARGET, totalDays);
  const availableTypes = getMonthShiftTypes(data, month).filter((type) => !type.archived);
  const exampleTypes = availableTypes.length
    ? availableTypes
    : DEFAULT_SHIFT_TYPES.map((type) => ({ ...type, id: `demo-${type.id}` }));
  const employees = ["김지우", "이도윤", "박서연", "최하준"].map((name, index) => ({
    id: `example-${index}`,
    name,
    color: colors[index],
    from: month,
  }));
  // Copy the entries once instead of rebuilding the full schedule for every day.
  const entries = { ...data.entries };

  employees.forEach((employee, employeeIndex) => {
    const offDays = new Set(
      Array.from({ length: offTarget }, (_, offIndex) => {
        const interval = Math.floor((offIndex * totalDays) / offTarget);

        return ((interval + employeeIndex * 5) % totalDays) + 1;
      }),
    );

    for (let day = 1; day <= totalDays; day++) {
      const key = `${dateKey(month, day)}:${employee.id}`;

      if (offDays.has(day)) {
        entries[key] = { category: "off" };
        continue;
      }

      const shift = exampleTypes[(day + employeeIndex) % exampleTypes.length];
      entries[key] = { category: "work", shift: structuredClone(shift) };
    }
  });

  return {
    ...data,
    entries,
    employees,
    typesByMonth: { ...data.typesByMonth, [month]: availableTypes.length
      ? getMonthShiftTypes(data, month)
      : [...getMonthShiftTypes(data, month), ...exampleTypes] },
  };
};

export const previousMonthKey = (month: string) => {
  const [year, monthNumber] = month.split("-").map(Number);
  const previous = new Date(year, monthNumber - 2, 1);

  return monthKey(previous.getFullYear(), previous.getMonth());
};

export const copyPreviousMonthTypes = (
  data: Schedule,
  month: string,
  createId: CreateId = () => crypto.randomUUID(),
): CommandResult => {
  const previous = previousMonthKey(month);
  const sourceTypes = getMonthShiftTypes(data, previous).filter((type) => !type.archived);

  if (!sourceTypes.length) return { ok: false, error: "이전 월에 복사할 근무 타입이 없어요." };

  const currentTypes = getMonthShiftTypes(data, month);
  const names = new Set(currentTypes.filter((type) => !type.archived).map((type) => type.name));
  const additions = sourceTypes.filter((type) => !names.has(type.name)).map((type) => ({
    ...type,
    id: createId(),
  }));

  if (!additions.length) return { ok: false, error: "같은 이름의 근무 타입이 이미 있어요. 기존 타입은 유지돼요." };

  return {
    ok: true,
    data: { ...data, typesByMonth: { ...data.typesByMonth, [month]: [...currentTypes, ...additions] } },
    message: `이전 월의 근무 타입 ${additions.length}개를 복사했어요. 기존 타입과 배정은 유지돼요.`,
  };
};
