import {
  dateKey,
  daysInMonth,
  getAssignment,
  isEmployeeVisibleOn,
  type Employee,
  type Schedule,
} from "./schedule";

const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;

const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);

  return hours * MINUTES_PER_HOUR + minutes;
};

export const monthlyWorkMinutes = (
  data: Pick<Schedule, "entries">,
  month: string,
  employee: Employee,
) => {
  let totalMinutes = 0;
  const totalDays = daysInMonth(month);

  for (let day = 1; day <= totalDays; day++) {
    const date = dateKey(month, day);
    if (!isEmployeeVisibleOn(employee, date)) continue;

    const assignment = getAssignment(data, date, employee.id);
    if (assignment.category !== "work" || !assignment.shift) continue;

    const startMinutes = timeToMinutes(assignment.shift.start);
    const endMinutes = timeToMinutes(assignment.shift.end);
    // 자정을 넘는 근무도 배정된 날짜가 속한 월에 전부 합산합니다.
    totalMinutes += (endMinutes - startMinutes + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  }

  return totalMinutes;
};

export const formatWorkTime = (totalMinutes: number) => {
  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
  const minutes = totalMinutes % MINUTES_PER_HOUR;

  return minutes ? `${hours}시간 ${minutes}분` : `${hours}시간`;
};
