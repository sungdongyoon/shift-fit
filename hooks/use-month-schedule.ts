"use client";

import { useMemo } from "react";
import { buildMonthCells } from "@/lib/calendar";
import { activeEmployees, counts, DEFAULT_OFF_TARGET, getMonthShiftTypes } from "@/lib/schedule";
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
  const typesByMonth = usePlannerStore((state) => state.data.typesByMonth);
  const month = usePlannerStore((state) => state.view.month);

  return useMemo(() => getMonthShiftTypes({ typesByMonth }, month).filter((type) => !type.archived), [typesByMonth, month]);
};

// Calendar layout does not depend on assignments or the monthly off target.
export const useMonthCalendar = () => {
  const month = usePlannerStore((state) => state.view.month);

  const employees = useMonthEmployees();

  const cells = useMemo(() => buildMonthCells(month), [month]);
  const [year = 0, monthNumber = 0] = month.split("-").map(Number);

  return { month, year, monthNumber, cells, employees };
};

export const useMonthSchedule = () => {
  const month = usePlannerStore((state) => state.view.month);
  const entries = usePlannerStore((state) => state.data.entries);
  const target = usePlannerStore(
    (state) => state.data.targets[state.view.month] ?? DEFAULT_OFF_TARGET,
  );

  const employees = useMonthEmployees();

  // Shift-type edits and off-target edits do not change assignment totals.
  const stats = useMemo(
    () => employees.map((employee) => ({
      ...employee,
      counts: counts({ entries, employees }, month, employee.id),
    })),
    [entries, month, employees],
  );
  const mismatch = stats.filter((employee) => employee.counts.off !== target).length;

  return { employees, target, stats, mismatch };
};
