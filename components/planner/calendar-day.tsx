"use client";

import { memo, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  isEmployeeVisibleOn,
  defaultAssignment,
  type Employee,
} from "@/lib/schedule";
import { usePlannerStore } from "@/providers/planner-provider";
import { compareCalendarRows } from "@/lib/calendar";
import { CalendarAssignment } from "./calendar-assignment";
import { FaPlus } from "react-icons/fa6";

type CalendarDayProps = {
  date: string;
  day: number;
  column: number;
  holiday?: string;
  employees: Employee[];
};

const dateAppearance = (isToday: boolean, isRedDay: boolean, column: number) => {
  if (isToday && isRedDay) return "rounded-full bg-danger-subtle font-bold text-danger";

  if (isToday) return "rounded-full bg-brand font-bold text-on-brand";

  if (isRedDay) return "text-danger";

  if (column === 6) return "text-[#5686d6]";

  return "";
};

export const CalendarDay = memo(
  ({ date, day, column, holiday, employees }: CalendarDayProps) => {
    const today = usePlannerStore((state) => state.view.today);
    const selected = usePlannerStore((state) => state.view.selected);
    const addAssignment = usePlannerStore((state) => state.addAssignment);
    const editAssignment = usePlannerStore((state) => state.editAssignment);
    // Subscribe to this date's immutable assignment references, not the entire schedule.
    const assignments = usePlannerStore(
      useShallow((state) =>
        employees.map(
          (employee) =>
            state.data.entries[`${date}:${employee.id}`] ?? defaultAssignment(employee, date),
        ),
      ),
    );

    const rows = useMemo(
      () =>
        employees
          .map((employee, index) => ({
            employee,
            assignment: assignments[index],
          }))
          .filter(({ employee }) => isEmployeeVisibleOn(employee, date))
          .sort(compareCalendarRows),
      [employees, assignments, date],
    );

    const monthNumber = Number(date.slice(5, 7));
    const isToday = date === today;
    const isRedDay = Boolean(holiday) || column === 0;
    const dateClasses = dateAppearance(isToday, isRedDay, column);

    return (
      <div className="group/day min-h-[127px] min-w-0 border-r border-b border-line px-1.5 pt-2 pb-2.5 [&:nth-child(7n)]:border-r-0 min-[1600px]:min-h-[150px] max-[640px]:min-h-[120px]">
        <div className="mb-[5px] flex min-h-[22px] items-center gap-[3px]">
          <span
            aria-current={isToday ? "date" : undefined}
            className={`grid size-[22px] shrink-0 place-items-center text-[11px] min-[1600px]:text-xs/normal ${dateClasses}`}
          >
            {day}
          </span>
          {isToday && (
            <span className="text-[8px] text-brand-content">오늘</span>
          )}
          {holiday && (
            <span
              className="min-w-0 truncate text-[9px] font-medium text-danger"
              title={holiday}
            >
              {holiday}
            </span>
          )}
          <button
            className="ml-auto size-[22px] flex justify-center items-center shrink-0 rounded-[5px] border-0 bg-surface-hover text-lg/normal text-content-secondary opacity-0 group-hover/day:opacity-100 group-focus-within/day:opacity-100 focus-visible:opacity-100 hover:bg-brand-subtle hover:text-brand-content max-[640px]:opacity-100 [@media(hover:none)]:opacity-100"
            aria-label={`${monthNumber}월 ${day}일 근무 추가`}
            onClick={() => addAssignment(date)}
          >
            <FaPlus className="size-3" />
          </button>
        </div>
        <div className="flex flex-col gap-1">
          {rows.map(({ employee, assignment }) => (
            <CalendarAssignment
              key={employee.id}
              date={date}
              employee={employee}
              assignment={assignment}
              selected={selected}
              onEdit={editAssignment}
            />
          ))}
        </div>
      </div>
    );
  },
);
CalendarDay.displayName = "CalendarDay";
