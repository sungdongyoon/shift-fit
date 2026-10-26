"use client";
import { memo, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  assignmentColor,
  labels,
  type Assignment,
  type Employee,
} from "@/lib/schedule";
import { usePlannerStore } from "@/providers/planner-provider";
import { tint } from "./presentation";

const DEFAULT_OFF: Assignment = { category: "off" };

type CalendarDayProps = {
  date: string;
  day: number;
  column: number;
  employees: Employee[];
};

export const CalendarDay = memo(
  ({ date, day, column, employees }: CalendarDayProps) => {
    const today = usePlannerStore((state) => state.view.today);
    const selected = usePlannerStore((state) => state.view.selected);
    const addAssignment = usePlannerStore((state) => state.addAssignment);
    const editAssignment = usePlannerStore((state) => state.editAssignment);
    // Subscribe to this date's immutable assignment references, not the entire schedule.
    const assignments = usePlannerStore(
      useShallow((state) =>
        employees.map(
          (employee) =>
            state.data.entries[`${date}:${employee.id}`] ?? DEFAULT_OFF,
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
          .sort((a, b) => {
            const aTime =
              a.assignment.category === "work"
                ? (a.assignment.shift?.start ?? "")
                : `z${a.assignment.category}`;
            const bTime =
              b.assignment.category === "work"
                ? (b.assignment.shift?.start ?? "")
                : `z${b.assignment.category}`;
            return (
              aTime.localeCompare(bTime) ||
              a.employee.name.localeCompare(b.employee.name, "ko")
            );
          }),
      [employees, assignments],
    );
    const monthNumber = Number(date.slice(5, 7));
    return (
      <div className="group/day min-h-[127px] min-w-0 border-r border-b border-line px-1.5 pt-2 pb-2.5 [&:nth-child(7n)]:border-r-0 min-[1600px]:min-h-[150px] max-[640px]:min-h-[120px]">
        <div className="mb-[5px] flex min-h-[22px] items-center gap-[3px]">
          <span
            className={`grid size-[22px] place-items-center text-[11px] min-[1600px]:text-xs/normal ${date === today ? "rounded-full bg-brand font-bold text-on-brand" : column === 0 ? "text-[#d86060]" : column === 6 ? "text-[#5686d6]" : ""}`}
          >
            {day}
          </span>
          {date === today && (
            <span className="text-[8px] text-brand-content">오늘</span>
          )}
          <button
            className="ml-auto size-[22px] shrink-0 rounded-[5px] border-0 bg-surface-hover text-lg/normal text-content-secondary opacity-0 group-hover/day:opacity-100 group-focus-within/day:opacity-100 focus-visible:opacity-100 hover:bg-brand-subtle hover:text-brand-content max-[640px]:opacity-100 [@media(hover:none)]:opacity-100"
            aria-label={`${monthNumber}월 ${day}일 근무 추가`}
            onClick={() => addAssignment(date)}
          >
            +
          </button>
        </div>
        <div className="flex flex-col gap-1">
          {rows.map(({ employee, assignment }) => (
            <button
              key={employee.id}
              className="min-h-6 w-full overflow-hidden rounded-[3px] border-0 border-l-[3px] border-l-[var(--shift-color)] bg-[var(--shift-bg)] px-1.5 py-[5px] text-left text-[10px] leading-[1.3] font-medium text-ellipsis whitespace-nowrap text-content hover:shadow-[0_0_0_1px_var(--shift-color)] data-[dimmed=true]:opacity-20 data-[highlighted=true]:font-bold data-[highlighted=true]:shadow-[0_0_0_1px_var(--shift-color)] min-[1600px]:px-2 min-[1600px]:py-1.5 min-[1600px]:text-xs/normal"
              data-dimmed={!!selected && selected !== employee.id}
              data-highlighted={selected === employee.id}
              style={tint(assignmentColor(assignment))}
              title={`${employee.name} · ${labels[assignment.category]}${assignment.shift ? ` · ${assignment.shift.name} ${assignment.shift.start}–${assignment.shift.end}` : ""}`}
              aria-label={`${monthNumber}월 ${day}일 ${employee.name} ${labels[assignment.category]} 수정`}
              onClick={() => editAssignment(date, employee.id)}
            >
              {employee.name}
            </button>
          ))}
        </div>
      </div>
    );
  },
);
CalendarDay.displayName = "CalendarDay";
