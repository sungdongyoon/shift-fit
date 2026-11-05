import {
  EXISTING_SHIFT_TYPE_ID,
  type AssignmentEditor,
  type Editor,
  type EmployeeEditor,
  type ShiftTypeEditor,
} from "./editor";
import {
  activeEmployees,
  assign,
  colors,
  dateKey,
  daysInMonth,
  DEFAULT_OFF_TARGET,
  getAssignment,
  initial,
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
  editor: ShiftTypeEditor,
  createId: CreateId,
): CommandResult => {
  const name = editor.name.trim();
  const hasDuplicateName = data.types.some(
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

  const shiftType: ShiftType = {
    id: editor.id ?? createId(),
    name,
    start: editor.start,
    end: editor.end,
    color: editor.color,
  };
  const types = editor.id
    ? data.types.map((type) => (type.id === editor.id ? shiftType : type))
    : [...data.types, shiftType];

  return {
    ok: true,
    data: { ...data, types },
    message: editor.id
      ? "근무 타입을 수정했어요. 기존 배정은 유지돼요."
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
  const hasDuplicateName = activeEmployees(data, month).some(
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
      : "근무자를 추가했어요. 모든 날짜는 휴무로 시작해요.",
  };
};

const saveAssignment = (
  data: Schedule,
  month: string,
  editor: AssignmentEditor,
): CommandResult => {
  const hasEmployee = activeEmployees(data, month).some(
    (employee) => employee.id === editor.employee,
  );

  if (!hasEmployee) {
    return { ok: false, error: "배정할 근무자를 선택해 주세요." };
  }

  // Preserve the snapshot until the user explicitly selects a replacement type.
  const shift = editor.typeId === EXISTING_SHIFT_TYPE_ID
    ? getAssignment(data, editor.date, editor.employee).shift
    : data.types.find((type) => !type.archived && type.id === editor.typeId);

  if (editor.category === "work" && !shift) {
    return { ok: false, error: "근무 타입을 선택해 주세요." };
  }

  return {
    ok: true,
    data: assign(data, editor.date, editor.employee, {
      category: editor.category,
      ...(editor.category === "work" ? { shift } : {}),
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
      return saveShiftType(data, editor, createId);
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
        types: data.types.map((type) =>
          type.id === editor.id ? { ...type, archived: true } : type,
        ),
      },
      message: "근무 타입을 삭제했어요. 기존 배정은 유지돼요.",
    };
  }

  const employee = data.employees.find((item) => item.id === editor.id);
  const hasRecords = Boolean(employee && employee.from < month) ||
    Object.keys(data.entries).some((key) => key.endsWith(`:${editor.id}`));
  const employees = hasRecords
    ? data.employees.map((item) =>
      item.id === editor.id ? { ...item, until: month } : item,
    )
    : data.employees.filter((item) => item.id !== editor.id);

  return {
    data: { ...data, employees },
    message: hasRecords
      ? "근무자를 비활성화했어요. 이번 달까지의 기록은 유지돼요."
      : "근무자를 삭제했어요.",
  };
};

export const createExampleSchedule = (
  data: Schedule,
  month: string,
): Schedule => {
  if (data.employees.length) return data;

  const totalDays = daysInMonth(month);
  const offTarget = Math.min(data.targets[month] ?? DEFAULT_OFF_TARGET, totalDays);
  const availableTypes = data.types.filter((type) => !type.archived);
  const exampleTypes = availableTypes.length
    ? availableTypes
    : initial.types.map((type) => ({ ...type, id: `demo-${type.id}` }));
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
      if (offDays.has(day)) continue;

      const key = `${dateKey(month, day)}:${employee.id}`;
      const shift = exampleTypes[(day + employeeIndex) % exampleTypes.length];
      entries[key] = { category: "work", shift: structuredClone(shift) };
    }
  });

  return {
    ...data,
    entries,
    employees,
    types: availableTypes.length ? data.types : [...data.types, ...exampleTypes],
  };
};
