import type { Editor } from "./editor";
import {
  activeEmployees,
  assign,
  colors,
  dateKey,
  daysInMonth,
  getAssignment,
  initial,
  type Employee,
  type Schedule,
  type ShiftType,
} from "./schedule";

type CommandResult =
  { ok: true; data: Schedule; message: string } | { ok: false; error: string };

export const saveScheduleEditor = (
  data: Schedule,
  month: string,
  editor: Editor,
  createId: () => string = () => crypto.randomUUID(),
): CommandResult => {
  const employees = activeEmployees(data, month);
  const types = data.types.filter((type) => !type.archived);

  if (editor.kind === "type") {
    const name = editor.name.trim();
    if (!name) return { ok: false, error: "근무 타입 이름을 입력해 주세요." };
    if (editor.start === editor.end)
      return { ok: false, error: "시작과 종료 시간을 다르게 설정해 주세요." };
    if (types.some((type) => type.id !== editor.id && type.name === name)) {
      return { ok: false, error: "같은 이름의 근무 타입이 있어요." };
    }
    const type: ShiftType = {
      id: editor.id ?? createId(),
      name,
      start: editor.start,
      end: editor.end,
      color: editor.color,
    };
    return {
      ok: true,
      data: {
        ...data,
        types: editor.id
          ? data.types.map((item) => (item.id === editor.id ? type : item))
          : [...data.types, type],
      },
      message: editor.id
        ? "근무 타입을 수정했어요. 기존 배정은 유지돼요."
        : "새 근무 타입을 추가했어요.",
    };
  }

  if (editor.kind === "employee") {
    const name = editor.name.trim();
    if (!name) return { ok: false, error: "근무자 이름을 입력해 주세요." };
    if (
      employees.some(
        (employee) => employee.id !== editor.id && employee.name === name,
      )
    ) {
      return {
        ok: false,
        error:
          "같은 이름의 근무자가 있어요. 구분할 수 있는 이름을 입력해 주세요.",
      };
    }
    const employee: Employee = {
      id: editor.id ?? createId(),
      name,
      color: editor.color,
      from: month,
    };
    return {
      ok: true,
      data: {
        ...data,
        employees: editor.id
          ? data.employees.map((item) =>
              item.id === editor.id
                ? { ...item, name, color: editor.color }
                : item,
            )
          : [...data.employees, employee],
      },
      message: editor.id
        ? "근무자 정보를 수정했어요."
        : "근무자를 추가했어요. 모든 날짜는 휴무로 시작해요.",
    };
  }

  if (!employees.some((employee) => employee.id === editor.employee)) {
    return { ok: false, error: "배정할 근무자를 선택해 주세요." };
  }
  // Keep the original snapshot until the user explicitly selects a replacement.
  const shift =
    editor.typeId === "__existing"
      ? getAssignment(data, editor.date, editor.employee).shift
      : types.find((type) => type.id === editor.typeId);
  if (editor.category === "work" && !shift)
    return { ok: false, error: "근무 타입을 선택해 주세요." };
  return {
    ok: true,
    data: assign(data, editor.date, editor.employee, {
      category: editor.category,
      ...(editor.category === "work" ? { shift } : {}),
    }),
    message: "배정을 저장했어요.",
  };
};

export const removeScheduleEditor = (
  data: Schedule,
  month: string,
  editor: Editor,
) => {
  if (editor.kind === "assignment")
    return {
      data: assign(data, editor.date, editor.employee, { category: "off" }),
      message: "배정을 삭제하고 휴무로 변경했어요.",
    };
  if (editor.kind === "type")
    return {
      data: {
        ...data,
        types: data.types.map((type) =>
          type.id === editor.id ? { ...type, archived: true } : type,
        ),
      },
      message: "근무 타입을 삭제했어요. 기존 배정은 유지돼요.",
    };

  const employee = data.employees.find((item) => item.id === editor.id);
  const hasRecords =
    (!!employee && employee.from < month) ||
    Object.keys(data.entries).some((key) => key.endsWith(`:${editor.id}`));
  return {
    data: {
      ...data,
      employees: hasRecords
        ? data.employees.map((item) =>
            item.id === editor.id ? { ...item, until: month } : item,
          )
        : data.employees.filter((item) => item.id !== editor.id),
    },
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
  const days = daysInMonth(month);
  const target = Math.min(data.targets[month] ?? 8, days);
  const availableTypes = data.types.filter((type) => !type.archived);
  const types = availableTypes.length
    ? availableTypes
    : initial.types.map((type) => ({ ...type, id: `demo-${type.id}` }));
  let example: Schedule = {
    ...data,
    types: availableTypes.length ? data.types : [...data.types, ...types],
    employees: ["김지우", "이도윤", "박서연", "최하준"].map((name, index) => ({
      id: `example-${index}`,
      name,
      color: colors[index],
      from: month,
    })),
  };
  example.employees.forEach((employee, index) => {
    const offDays = new Set(
      Array.from(
        { length: target },
        (_, day) =>
          ((Math.floor((day * days) / target) + index * 5) % days) + 1,
      ),
    );
    for (let day = 1; day <= days; day++) {
      if (!offDays.has(day))
        example = assign(example, dateKey(month, day), employee.id, {
          category: "work",
          shift: types[(day + index) % types.length],
        });
    }
  });
  return example;
};
