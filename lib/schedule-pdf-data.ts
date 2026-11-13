import { buildMonthCells, type CalendarRow } from "./calendar";
import type { HolidayMap } from "./holidays";
import {
  counts,
  employeesInMonth,
  isEmployeeVisibleOn,
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

const CATEGORY_ORDER = { work: 0, other: 1, off: 2, leave: 3, unassigned: 4 };

const comparePdfRows = (first: CalendarRow, second: CalendarRow) => {
  const categoryOrder = CATEGORY_ORDER[first.assignment.category] - CATEGORY_ORDER[second.assignment.category];

  if (categoryOrder !== 0) return categoryOrder;
  if (first.assignment.category !== "work") return 0;

  const firstShift = first.assignment.shift;
  const secondShift = second.assignment.shift;

  return (firstShift?.start ?? "").localeCompare(secondShift?.start ?? "")
    || (firstShift?.name ?? "").localeCompare(secondShift?.name ?? "", "ko");
};

const buildCalendarGroups = (data: Schedule, month: string, employees: Employee[], holidays: HolidayMap) => {
  const sortedDays = buildMonthCells(month).map((cell) => ({
    ...cell,
    holiday: holidays[cell.date],
    rows: cell.isCurrentMonth
      ? employees
          .filter((employee) => isEmployeeVisibleOn(employee, cell.date))
          .map((employee) => ({
            employee,
            assignment: getAssignment(data, cell.date, employee.id),
          }))
          .sort(comparePdfRows)
      : [],
  }));
  const groups = [];

  for (let start = 0; start < employees.length; start += EMPLOYEES_PER_CALENDAR) {
    const end = Math.min(start + EMPLOYEES_PER_CALENDAR, employees.length);
    const days = sortedDays.map((day) => ({
      ...day,
      rows: day.rows.slice(start, end),
    }));
    const weeks = [];

    for (let index = 0; index < days.length; index += 7) {
      weeks.push(days.slice(index, index + 7));
    }

    groups.push({ start: start + 1, end, weeks });
  }

  return groups;
};

export const buildSchedulePdfData = (data: Schedule, month: string, holidays: HolidayMap) => {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new Error("출력할 월을 확인해 주세요.");
  }

  const employees = employeesInMonth(data.employees, month);

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
