import {
  dateKey,
  daysInMonth,
  DEFAULT_OFF_TARGET,
  getAssignment,
  getMonthShiftTypes,
  type SavedMonth,
  type Schedule,
} from "./schedule";
import type { HolidayMap } from "./holidays";

export const createSavedMonth = (
  data: Schedule,
  month: string,
  holidays: HolidayMap,
  createId: () => string = () => crypto.randomUUID(),
  now = new Date(),
): SavedMonth => {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || !data.employees.length) {
    throw new Error("저장할 월과 근무자를 확인해 주세요.");
  }

  const entries: Schedule["entries"] = {};

  for (let day = 1; day <= daysInMonth(month); day++) {
    const date = dateKey(month, day);

    for (const employee of data.employees) {
      entries[`${date}:${employee.id}`] = structuredClone(getAssignment(data, date, employee.id));
    }
  }

  const versions = (data.savedMonths ?? []).filter((record) => record.month === month).map((record) => record.version);

  return {
    id: createId(),
    month,
    version: Math.max(0, ...versions) + 1,
    savedAt: now.toISOString(),
    data: {
      version: 3,
      employees: structuredClone(data.employees),
      entries,
      typesByMonth: { [month]: structuredClone(getMonthShiftTypes(data, month)) },
      targets: { [month]: data.targets[month] ?? DEFAULT_OFF_TARGET },
    },
    holidays: Object.fromEntries(Object.entries(holidays).filter(([date]) => date.startsWith(`${month}-`))),
  };
};
