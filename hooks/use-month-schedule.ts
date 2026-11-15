"use client";

import { useMemo } from "react";
import { buildMonthCells } from "@/lib/calendar";
import { counts, employeeOffTarget, employeesInMonth, DEFAULT_OFF_TARGET, getMonthShiftTypes } from "@/lib/schedule";
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
  const employeeOffTargets = usePlannerStore((state) => state.data.employeeOffTargets);
  const targets = usePlannerStore((state) => state.data.targets);
  const target = usePlannerStore(
    (state) => state.data.targets[state.view.month] ?? DEFAULT_OFF_TARGET,
  );

  const employees = useEmployees();

  // 근무 횟수와 개인별 기준을 현재 월 기준으로 함께 계산합니다.
  const stats = useMemo(
    () => employees.map((employee) => ({
      ...employee,
      counts: counts({ entries, employees }, month, employee.id),
      offTarget: month ? employeeOffTarget({ targets, employeeOffTargets }, month, employee.id) : null,
    })),
    [entries, month, employees, targets, employeeOffTargets],
  );
  const mismatch = employeesInMonth(stats, month).filter((employee) => employee.offTarget !== null && employee.counts.off !== employee.offTarget).length;

  return { employees, target, stats, mismatch };
};
