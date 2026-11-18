"use client";

import { TextField } from "@/components/ui/text-field";
import { buildMonthCells } from "@/lib/calendar";
import { dateKey, daysInMonth } from "@/lib/schedule";
import type { BatchDateSelection } from "@/lib/batch-date-selection";

type BatchDatePickerProps = {
  month: string;
  value: BatchDateSelection;
  availableDates: string[];
  disabledNotices: string[];
  onChange: (value: BatchDateSelection) => void;
};

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export const BatchDatePicker = ({
  month,
  value,
  availableDates,
  disabledNotices,
  onChange,
}: BatchDatePickerProps) => {
  const cells = buildMonthCells(month);
  const firstDate = availableDates[0] ?? `${month}-01`;
  const lastDate = availableDates.at(-1) ?? dateKey(month, daysInMonth(month));
  const noAvailableDates = availableDates.length === 0;
  const allSelected =
    !noAvailableDates &&
    availableDates.every((date) => value.dates.includes(date));
  const availableWeekdays = new Set(
    availableDates
      .filter((date) => date >= value.start && date <= value.end)
      .map((date) => new Date(`${date}T00:00:00Z`).getUTCDay()),
  );
  const workdays = [1, 2, 3, 4, 5].filter((day) => availableWeekdays.has(day));
  const weekends = [0, 6].filter((day) => availableWeekdays.has(day));

  const toggleDate = (date: string) => {
    if (!availableDates.includes(date)) return;

    onChange({
      ...value,
      dates: value.dates.includes(date)
        ? value.dates.filter((item) => item !== date)
        : [...value.dates, date],
    });
  };

  const toggleWeekday = (day: number) => {
    if (!availableWeekdays.has(day)) return;

    onChange({
      ...value,
      weekdays: value.weekdays.includes(day)
        ? value.weekdays.filter((item) => item !== day)
        : [...value.weekdays, day],
    });
  };

  return (
    <fieldset className="min-w-0 space-y-3">
      <legend className="mb-2 text-xs font-medium">날짜 선택</legend>
      <div className="flex gap-2" role="group" aria-label="날짜 선택 방식">
        {(["dates", "weekdays"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            aria-pressed={value.mode === mode}
            onClick={() => onChange({ ...value, mode })}
            className="flex-1 rounded-md border border-line px-3 py-2 text-xs aria-pressed:border-brand aria-pressed:bg-brand-subtle aria-pressed:text-brand-content"
          >
            {mode === "dates" ? "날짜 직접 선택" : "기간 내 요일 선택"}
          </button>
        ))}
      </div>
      {value.mode === "dates" ? (
        <>
          <div className="flex items-center justify-between text-[11px] text-content-secondary">
            <span>
              {month.replace("-", ". ")} · {value.dates.length}일 선택
            </span>
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...value,
                  dates: allSelected ? [] : availableDates,
                })
              }
              disabled={noAvailableDates}
              className="text-brand-content underline underline-offset-2 disabled:text-content-disabled"
            >
              {allSelected ? "날짜 선택 해제" : "이 달 전체 선택"}
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map((day) => (
              <span
                key={day}
                className="py-1 text-center text-[10px] text-content-tertiary"
              >
                {day}
              </span>
            ))}
            {cells.map((cell) =>
              cell.isCurrentMonth ? (
                <button
                  key={cell.date}
                  type="button"
                  aria-label={`${cell.date} 선택`}
                  aria-pressed={value.dates.includes(cell.date)}
                  disabled={!availableDates.includes(cell.date)}
                  onClick={() => toggleDate(cell.date)}
                  className="min-h-9 rounded-md text-xs text-content-secondary hover:bg-canvas-subtle aria-pressed:bg-brand aria-pressed:text-on-brand disabled:cursor-not-allowed disabled:bg-canvas-subtle disabled:text-content-disabled"
                >
                  {cell.day}
                </button>
              ) : (
                <span key={cell.date} />
              ),
            )}
          </div>
          {disabledNotices.length > 0 && (
            <div className="space-y-1 text-[8px] font-medium text-danger">
              {disabledNotices.map((notice) => (
                <p key={notice}>{notice}</p>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 max-[480px]:grid-cols-1">
            <TextField
              label="시작일"
              type="date"
              required
              disabled={noAvailableDates}
              min={firstDate}
              max={lastDate}
              value={value.start}
              onChange={(event) =>
                onChange({ ...value, start: event.target.value })
              }
            />
            <TextField
              label="종료일"
              type="date"
              required
              disabled={noAvailableDates}
              min={value.start || firstDate}
              max={lastDate}
              value={value.end}
              onChange={(event) =>
                onChange({ ...value, end: event.target.value })
              }
            />
          </div>
          <div className="flex gap-3 text-[11px] text-brand-content">
            <button
              type="button"
              disabled={!workdays.length}
              className="disabled:text-content-disabled"
              onClick={() => onChange({ ...value, weekdays: workdays })}
            >
              평일 선택
            </button>
            <button
              type="button"
              disabled={!weekends.length}
              className="disabled:text-content-disabled"
              onClick={() => onChange({ ...value, weekdays: weekends })}
            >
              주말 선택
            </button>
          </div>
          <div
            className="grid grid-cols-7 gap-1"
            role="group"
            aria-label="배정할 요일"
          >
            {WEEKDAYS.map((day, index) => (
              <button
                key={day}
                type="button"
                aria-pressed={
                  availableWeekdays.has(index) && value.weekdays.includes(index)
                }
                disabled={!availableWeekdays.has(index)}
                onClick={() => toggleWeekday(index)}
                className="min-h-9 rounded-md border border-line text-xs aria-pressed:border-brand aria-pressed:bg-brand-subtle aria-pressed:text-brand-content disabled:cursor-not-allowed disabled:bg-canvas-subtle disabled:text-content-disabled"
              >
                {day}
              </button>
            ))}
          </div>
        </>
      )}
    </fieldset>
  );
};
