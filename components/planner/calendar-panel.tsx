"use client";
import { Button } from "@/components/ui/button";
import { useMonthSchedule } from "@/hooks/use-month-schedule";
import { colors, dateKey } from "@/lib/schedule";
import { usePlannerStore } from "@/providers/planner-provider";
import { CalendarDay } from "./calendar-day";
import { Glyph } from "./glyph";

export const CalendarPanel = () => {
  const {
    month,
    year,
    monthNumber,
    days,
    offset,
    cells,
    employees,
    workCount,
  } = useMonthSchedule();
  const ready = usePlannerStore((state) => state.storageStatus !== "loading");
  const selected = usePlannerStore((state) => state.view.selected);
  const hasEmployees = usePlannerStore(
    (state) => state.data.employees.length > 0,
  );
  const navigate = usePlannerStore((state) => state.navigateMonth);
  const goToToday = usePlannerStore((state) => state.goToToday);
  const clearSelection = usePlannerStore((state) => state.clearSelection);
  const open = usePlannerStore((state) => state.openEditor);
  const loadExample = usePlannerStore((state) => state.loadExample);

  return (
    <section
      className="relative flex min-h-max min-w-0 flex-col"
      aria-label="월간 근무 캘린더"
      aria-busy={!ready}
    >
      <div className="flex items-center justify-between gap-2.5 px-[22px] pt-[23px] pb-[17px] max-[1200px]:px-3.5 max-[1200px]:pt-5 max-[1200px]:pb-3.5 max-[640px]:pt-[18px] max-[640px]:pb-3">
        <div className="flex items-center gap-3.5 max-[1200px]:gap-2">
          <h2 className="text-xl/normal font-bold tracking-[-0.7px] max-[1200px]:text-[17px]">
            {month ? `${year}년 ${monthNumber}월` : "캘린더"}
          </h2>
          <div className="flex gap-0.5">
            <button
              aria-label="이전 달"
              disabled={!ready}
              onClick={() => navigate(-1)}
              className="h-7 w-[26px] rounded-[5px] border-0 bg-transparent text-[23px] text-content-secondary hover:bg-surface-hover"
            >
              ‹
            </button>
            <button
              aria-label="다음 달"
              disabled={!ready}
              onClick={() => navigate(1)}
              className="h-7 w-[26px] rounded-[5px] border-0 bg-transparent text-[23px] text-content-secondary hover:bg-surface-hover"
            >
              ›
            </button>
          </div>
          <button
            className="rounded-md border border-line bg-transparent px-2.5 py-[5px] text-[11px]"
            disabled={!ready}
            onClick={goToToday}
          >
            오늘
          </button>
        </div>
        <span className="flex items-center gap-1.5 rounded-md border border-line px-[9px] py-[7px] text-[10px] text-content-secondary max-[1200px]:hidden max-[640px]:flex max-[640px]:text-[9px]">
          <Glyph name="calendar" className="size-[13px]" />
          월간 보기
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 px-[23px] pb-[19px] text-[10px] text-content-tertiary max-[1200px]:px-3.5 max-[1200px]:pb-3.5">
        <span className="first:flex first:items-center first:gap-1.5 max-[1200px]:last:hidden">
          <span className="inline-block size-[5px] rounded-full bg-brand" />
          {employees.length}명의 근무표{" "}
          <i className="mx-0.5 text-content-disabled not-italic">·</i> 총{" "}
          {workCount}회 근무
        </span>
        <span className="first:flex first:items-center first:gap-1.5 max-[1200px]:last:hidden">
          일정은 자동으로 저장돼요
        </span>
      </div>
      {selected && (
        <div className="flex justify-between gap-2 bg-brand-subtle px-5 py-2 text-[10px] text-brand-content">
          {employees.find((employee) => employee.id === selected)?.name} 님의
          일정을 강조하고 있어요
          <button onClick={clearSelection} className="border-0 bg-transparent">
            강조 해제 ×
          </button>
        </div>
      )}
      <div className="flex-1 overflow-x-auto max-[640px]:max-h-[650px]">
        <div className="grid min-h-full min-w-[560px] auto-rows-auto grid-cols-7 max-[960px]:min-w-[520px] max-[640px]:min-w-[560px]">
          {["일", "월", "화", "수", "목", "금", "토"].map((day, index) => (
            <div
              key={day}
              className={`border-y border-line bg-canvas-subtle px-2 py-3 text-center text-[10px] font-semibold ${index === 0 ? "text-[#d86060]" : index === 6 ? "text-[#5686d6]" : ""}`}
            >
              {day}
            </div>
          ))}
          {Array.from({ length: cells }, (_, index) => {
            const day = index - offset + 1;
            if (day < 1 || day > days)
              return (
                <div
                  key={`outside-${index}`}
                  className="min-h-[127px] min-w-0 border-r border-b border-line bg-canvas-subtle p-[13px] text-[11px] text-content-disabled [&:nth-child(7n)]:border-r-0 min-[1600px]:min-h-[150px] max-[640px]:min-h-[120px]"
                >
                  <span>{new Date(year, monthNumber - 1, day).getDate()}</span>
                </div>
              );
            const date = dateKey(month, day);
            return (
              <CalendarDay
                key={date}
                date={date}
                day={day}
                column={index % 7}
                employees={employees}
              />
            );
          })}
        </div>
      </div>
      {ready && !employees.length && (
        <div className="absolute top-[220px] left-1/2 z-1 w-[330px] max-w-[90%] -translate-x-1/2 rounded-[14px] border border-line bg-canvas px-5 py-[26px] text-center shadow-[0_6px_45px_#1717190a] max-[640px]:top-[185px]">
          <div className="mx-auto mb-3.5 grid size-10 place-items-center rounded-xl bg-brand-subtle text-brand-content">
            <Glyph name="people" />
          </div>
          <h3 className="text-[15px] font-bold">
            함께 일할 팀원을 추가해 주세요
          </h3>
          <p className="mt-2.5 mb-[18px] text-[11px] leading-[1.9] text-content-tertiary">
            직원을 등록하면 모든 날짜에 이름이 표시돼요.
            <br />
            처음에는 휴무로 채워지고, 원하는 날에 근무를 배정할 수 있어요.
          </p>
          <Button
            size="sm"
            onClick={() =>
              open({ kind: "employee", name: "", color: colors[0] })
            }
            className="text-xs/normal"
          >
            + 첫 근무자 추가
          </Button>
          {!hasEmployees && (
            <button
              className="mx-auto mt-[13px] block border-0 bg-transparent text-[10px] text-content-tertiary"
              onClick={loadExample}
            >
              예시 근무표 먼저 둘러보기 ↗
            </button>
          )}
        </div>
      )}
      <div className="flex min-h-[42px] items-center justify-between gap-2.5 px-4 py-2.5 text-[9px] text-content-tertiary">
        <span className="first:flex first:items-center first:gap-[5px] max-[1200px]:last:hidden">
          <Glyph name="clock" className="size-3" />
          근무 시작 시간순 정렬
        </span>
        <span className="first:flex first:items-center first:gap-[5px] max-[1200px]:last:hidden">
          빈 날짜 없이, 직원당 하루 한 일정
        </span>
      </div>
    </section>
  );
};
