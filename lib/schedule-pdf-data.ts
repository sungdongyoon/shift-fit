import { buildMonthCells, compareCalendarRows } from "./calendar";
import type { HolidayMap } from "./holidays";
import {
  activeEmployees,
  counts,
  DEFAULT_OFF_TARGET,
  getAssignment,
  getMonthShiftTypes,
  type Employee,
  type Schedule,
  type ShiftType,
} from "./schedule";

// Each group contains a whole month on one A4 landscape page, including six-week months.
const EMPLOYEES_PER_CALENDAR = 5;

const shiftKey = (shift: ShiftType) =>
  [shift.id, shift.name, shift.start, shift.end, shift.color].join("|");

const buildCalendarGroups = (data: Schedule, month: string, employees: Employee[], holidays: HolidayMap) => {
  const cells = buildMonthCells(month);
  const groups = [];

  for (let start = 0; start < employees.length; start += EMPLOYEES_PER_CALENDAR) {
    const groupEmployees = employees.slice(start, start + EMPLOYEES_PER_CALENDAR);
    const days = cells.map((cell) => ({
      ...cell,
      holiday: holidays[cell.date],
      rows: cell.isCurrentMonth
        ? groupEmployees.map((employee) => ({
            employee,
            assignment: getAssignment(data, cell.date, employee.id),
          })).sort(compareCalendarRows)
        : [],
    }));
    const weeks = [];

    for (let index = 0; index < days.length; index += 7) {
      weeks.push(days.slice(index, index + 7));
    }

    groups.push({ start: start + 1, end: start + groupEmployees.length, weeks });
  }

  return groups;
};

export const buildSchedulePdfData = (data: Schedule, month: string, holidays: HolidayMap) => {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new Error("출력할 월을 확인해 주세요.");
  }

  const employees = activeEmployees(data, month);

  if (!employees.length) throw new Error("출력할 근무자를 먼저 등록해 주세요.");

  const calendars = buildCalendarGroups(data, month, employees, holidays);
  const shiftTypes = new Map<string, ShiftType>();

  getMonthShiftTypes(data, month).filter((shift) => !shift.archived).forEach((shift) => {
    shiftTypes.set(shiftKey(shift), shift);
  });

  // Archived types remain in the legend while they are used by saved assignments.
  calendars.forEach((calendar) => calendar.weeks.flat().forEach((day) => {
    day.rows.forEach(({ assignment }) => {
      if (assignment.category === "work" && assignment.shift) {
        shiftTypes.set(shiftKey(assignment.shift), assignment.shift);
      }
    });
  }));

  const [year, monthNumber] = month.split("-").map(Number);

  return {
    month,
    title: `${year}년 ${monthNumber}월 근무표`,
    filename: `shiftfit-${month}.pdf`,
    target: data.targets[month] ?? DEFAULT_OFF_TARGET,
    shiftTypes: [...shiftTypes.values()].sort((first, second) => first.start.localeCompare(second.start)),
    calendars,
    employees: employees.map((employee) => ({
      ...employee,
      counts: counts(data, month, employee.id),
    })),
  };
};

export type SchedulePdfData = ReturnType<typeof buildSchedulePdfData>;
