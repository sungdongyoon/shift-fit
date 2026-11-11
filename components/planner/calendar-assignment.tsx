import { assignmentColor, assignmentLabel, type Assignment, type Employee } from "@/lib/schedule";
import { tint } from "./presentation";

type CalendarAssignmentProps = {
  date: string;
  employee: Employee;
  assignment: Assignment;
  selected: string;
  onEdit: (date: string, employeeId: string) => void;
};

export const CalendarAssignment = ({
  date,
  employee,
  assignment,
  selected,
  onEdit,
}: CalendarAssignmentProps) => {
  const scheduleName = assignmentLabel(assignment);
  const shiftDetails = assignment.category === "work" && assignment.shift
    ? `${assignment.shift.start}–${assignment.shift.end}`
    : "";
  const memo = assignment.category === "other" ? assignment.memo?.trim() : "";
  const description = [employee.name, scheduleName, shiftDetails, memo].filter(Boolean).join(" · ");
  const monthNumber = Number(date.slice(5, 7));
  const day = Number(date.slice(8));

  return (
    <button
      className="flex min-h-6 w-full items-center gap-1 overflow-hidden rounded-[3px] border-0 border-l-[3px] border-l-[var(--shift-color)] bg-[var(--shift-bg)] px-1.5 py-[5px] text-left text-[10px] leading-[1.3] font-medium text-content hover:shadow-[0_0_0_1px_var(--shift-color)] data-[dimmed=true]:opacity-20 data-[highlighted=true]:font-bold data-[highlighted=true]:shadow-[0_0_0_1px_var(--shift-color)] min-[1600px]:px-2 min-[1600px]:py-1.5 min-[1600px]:text-xs/normal"
      data-dimmed={!!selected && selected !== employee.id}
      data-highlighted={selected === employee.id}
      style={tint(assignmentColor(assignment))}
      title={description}
      aria-label={`${monthNumber}월 ${day}일 ${description} 수정`}
      onClick={() => onEdit(date, employee.id)}
    >
      <span className="max-w-full shrink-0 truncate">{employee.name}</span>
      <span className="min-w-0 truncate text-[9px] font-normal text-content-secondary min-[1600px]:text-[10px]">
        · {scheduleName}
      </span>
    </button>
  );
};
