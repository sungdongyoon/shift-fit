import { dateKey, daysInMonth, monthKey, type Assignment, type Employee } from "./schedule";

export type CalendarCell = {
  date: string;
  day: number;
  column: number;
  isCurrentMonth: boolean;
};

export type CalendarRow = {
  employee: Employee;
  assignment: Assignment;
};

export const buildMonthCells = (month: string): CalendarCell[] => {
  if (!month) return [];

  const [year, monthNumber] = month.split("-").map(Number);
  const offset = new Date(year, monthNumber - 1, 1).getDay();
  const totalDays = daysInMonth(month);
  const cellCount = Math.ceil((offset + totalDays) / 7) * 7;

  return Array.from({ length: cellCount }, (_, index) => {
    const day = index - offset + 1;
    const date = new Date(year, monthNumber - 1, day);
    const cellMonth = monthKey(date.getFullYear(), date.getMonth());

    return {
      date: dateKey(cellMonth, date.getDate()),
      day: date.getDate(),
      column: index % 7,
      isCurrentMonth: day >= 1 && day <= totalDays,
    };
  });
};

const assignmentSortKey = (assignment: Assignment) => {
  if (assignment.category === "work") return assignment.shift?.start ?? "";

  return `z${assignment.category}`;
};

export const compareCalendarRows = (first: CalendarRow, second: CalendarRow) => {
  const byTime = assignmentSortKey(first.assignment).localeCompare(
    assignmentSortKey(second.assignment),
  );

  return byTime || first.employee.name.localeCompare(second.employee.name, "ko");
};
