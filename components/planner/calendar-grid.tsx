import type { CalendarCell } from "@/lib/calendar";
import type { HolidayMap } from "@/lib/holidays";
import type { Employee } from "@/lib/schedule";
import { CalendarDay } from "./calendar-day";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

type CalendarGridProps = {
  cells: CalendarCell[];
  employees: Employee[];
  holidays: HolidayMap;
};

export const CalendarGrid = ({ cells, employees, holidays }: CalendarGridProps) => (
  <div className="flex-1 overflow-x-auto max-[640px]:max-h-[650px]">
    <div className="grid min-h-full min-w-[560px] auto-rows-auto grid-cols-7 max-[960px]:min-w-[520px] max-[640px]:min-w-[560px]">
      {WEEKDAYS.map((weekday, column) => (
        <div
          key={weekday}
          data-sunday={column === 0}
          data-saturday={column === 6}
          className="border-y border-line bg-canvas-subtle px-2 py-3 text-center text-[10px] font-semibold data-[sunday=true]:text-danger data-[saturday=true]:text-[#5686d6]"
        >
          {weekday}
        </div>
      ))}
      {cells.map((cell) => {
        if (!cell.isCurrentMonth) {
          return (
            <div
              key={cell.date}
              className="min-h-[127px] min-w-0 border-r border-b border-line bg-canvas-subtle p-[13px] text-[11px] text-content-disabled [&:nth-child(7n)]:border-r-0 min-[1600px]:min-h-[150px] max-[640px]:min-h-[120px]"
            >
              <span>{cell.day}</span>
            </div>
          );
        }

        return (
          <CalendarDay
            key={cell.date}
            date={cell.date}
            day={cell.day}
            column={cell.column}
            holiday={holidays[cell.date]}
            employees={employees}
          />
        );
      })}
    </div>
  </div>
);
