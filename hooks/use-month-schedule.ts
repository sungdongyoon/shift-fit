"use client";

import { useMemo } from "react";
import { buildMonthCells } from "@/lib/calendar";
import { counts, employeesInMonth, getMonthShiftTypes } from "@/lib/schedule";
import { usePlannerStore } from "@/providers/planner-provider";

export const useEmployees = () =>
  usePlannerStore((state) => state.data.employees);

export const useShiftTypes = () => {
  const typesByMonth = usePlannerStore((state) => state.data.typesByMonth);
  const month = usePlannerStore((state) => state.view.month);

  return useMemo(() => getMonthShiftTypes({ typesByMonth }, month).filter((type) => !type.archived), [typesByMonth, month]);
};

// Calendar layout does not depend on assignments or the monthly off target.
export const useMonthCalendar = () => {
  const month = usePlannerStore((state) => state.view.month);

  const employees = useEmployees();

  const visibleEmployees = useMemo(() => employeesInMonth(employees, month), [employees, month]);

  const cells = useMemo(() => buildMonthCells(month), [month]);
  const [year = 0, monthNumber = 0] = month.split("-").map(Number);

  return { month, year, monthNumber, cells, employees: visibleEmployees };
};

export const useMonthSchedule = () => {
  const month = usePlannerStore((state) => state.view.month);
  const entries = usePlannerStore((state) => state.data.entries);
  const employees = useEmployees();

  // 현재 월의 실제 배정 횟수만 집계합니다.
  const stats = useMemo(
    () => employees.map((employee) => ({
      ...employee,
      counts: counts({ entries, employees }, month, employee.id),
    })),
    [entries, month, employees],
  );

  return { employees, stats };
};
