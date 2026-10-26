"use client";

import { useMemo } from "react";
import { activeEmployees, counts, daysInMonth } from "@/lib/schedule";
import { usePlannerStore } from "@/providers/planner-provider";

export const useMonthEmployees = () => {
  const employees = usePlannerStore((state) => state.data.employees);
  const month = usePlannerStore((state) => state.view.month);
  return useMemo(
    () => (month ? activeEmployees({ employees }, month) : []),
    [employees, month],
  );
};

export const useShiftTypes = () => {
  const types = usePlannerStore((state) => state.data.types);
  return useMemo(() => types.filter((type) => !type.archived), [types]);
};

export const useMonthSchedule = () => {
  const data = usePlannerStore((state) => state.data);
  const month = usePlannerStore((state) => state.view.month);
  const employees = useMonthEmployees();
  const target = data.targets[month] ?? 8;
  const stats = useMemo(
    () =>
      employees.map((employee) => ({
        ...employee,
        counts: counts(data, month, employee.id),
      })),
    [data, month, employees],
  );
  const [year, monthNumber] = month.split("-").map(Number);
  const days = month ? daysInMonth(month) : 0;
  const offset = month ? new Date(year, monthNumber - 1, 1).getDay() : 0;

  return {
    month,
    employees,
    target,
    stats,
    days,
    year,
    monthNumber,
    offset,
    cells: Math.ceil((offset + days) / 7) * 7,
    mismatch: stats.filter((employee) => employee.counts.off !== target).length,
    workCount: stats.reduce((sum, employee) => sum + employee.counts.work, 0),
  };
};
