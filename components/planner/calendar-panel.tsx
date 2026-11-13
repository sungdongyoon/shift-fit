"use client";

import { Button } from "@/components/ui/button";
import { useHolidays } from "@/hooks/use-holidays";
import { useMonthCalendar } from "@/hooks/use-month-schedule";
import { colors } from "@/lib/schedule";
import { usePlannerStore } from "@/providers/planner-provider";
import { SavePlannerButton } from "./save-planner-button";
import { PdfExportButton } from "./pdf-export-button";
import { CalendarGrid } from "./calendar-grid";
import { Glyph } from "./glyph";
import { FaPlus, FaChevronLeft, FaChevronRight } from "react-icons/fa6";

export const CalendarPanel = () => {
  const { month, year, monthNumber, cells, employees } = useMonthCalendar();

  const { holidays, status: holidayStatus, retry } = useHolidays(year);

  const ready = usePlannerStore(
    (state) =>
      state.storageStatus !== "loading" && state.storageStatus !== "blocked",
  );
  const selected = usePlannerStore((state) => state.view.selected);
  const hasEmployees = usePlannerStore(
    (state) => state.data.employees.length > 0,
  );
  const navigate = usePlannerStore((state) => state.navigateMonth);
  const goToToday = usePlannerStore((state) => state.goToToday);
  const clearSelection = usePlannerStore((state) => state.clearSelection);
  const open = usePlannerStore((state) => state.openEditor);
  const loadExample = usePlannerStore((state) => state.loadExample);

  const selectedEmployee = employees.find(
    (employee) => employee.id === selected,
  );
  const showHolidayNotice =
    holidayStatus === "error" || holidayStatus === "unavailable";

  return (
    <section
      className="relative flex min-h-max min-w-0 flex-col"
      aria-label="월간 근무 캘린더"
      aria-busy={!ready}
    >
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-[22px] pt-[23px] pb-[17px] max-[1200px]:px-3.5 max-[1200px]:pt-5 max-[1200px]:pb-3.5 max-[640px]:pt-[18px] max-[640px]:pb-3">
        <div className="flex items-center gap-3.5 max-[1200px]:gap-2">
          <h2 className="text-xl/normal font-bold tracking-[-0.7px] max-[1200px]:text-[17px]">
            {month ? `${year}년 ${monthNumber}월` : "캘린더"}
          </h2>
          <div className="flex gap-0.5">
            <button
              aria-label="이전 달"
              disabled={!ready}
              onClick={() => navigate(-1)}
              className="h-7 w-[26px] flex justify-center items-center border-0 rounded-[5px] border bg-transparent text-[23px] text-content-secondary hover:bg-surface-hover"
            >
              <FaChevronLeft className="size-3" />
            </button>
            <button
              aria-label="다음 달"
              disabled={!ready}
              onClick={() => navigate(1)}
              className="h-7 w-[26px] flex justify-center items-center rounded-[5px] border-0 bg-transparent text-[23px] text-content-secondary hover:bg-surface-hover"
            >
              <FaChevronRight className="size-3" />
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
        <div className="flex flex-wrap items-center gap-2">
          <SavePlannerButton />
          <PdfExportButton
            month={month}
            holidays={holidays}
            disabled={!ready || !employees.length}
          />
        </div>
      </div>
      {showHolidayNotice && (
        <div
          role="status"
          className="flex items-center justify-between gap-2 border-t border-line px-4 py-2 text-[10px] text-content-secondary"
        >
          <span>
            {holidayStatus === "unavailable"
              ? `${year}년 공휴일 최신 정보가 아직 제공되지 않아요.`
              : "공휴일 최신 정보를 확인하지 못했어요."}
            {Object.keys(holidays).length > 0 &&
              " 저장된 공휴일을 표시하고 있어요."}
          </span>
          <button
            onClick={retry}
            className="shrink-0 underline underline-offset-2"
          >
            다시 확인
          </button>
        </div>
      )}
      {selected && (
        <div className="flex justify-between gap-2 bg-brand-subtle px-5 py-2 text-[10px] text-brand-content">
          {selectedEmployee?.name} 님의 일정을 강조하고 있어요
          <button onClick={clearSelection} className="border-0 bg-transparent">
            강조 해제 ×
          </button>
        </div>
      )}
      <CalendarGrid cells={cells} holidays={holidays} employees={employees} />
      {ready && !employees.length && (
        <div className="absolute top-[220px] left-1/2 z-1 w-[330px] max-w-[90%] -translate-x-1/2 rounded-[14px] border border-line bg-canvas px-5 py-[26px] text-center shadow-[0_6px_45px_#1717190a] max-[640px]:top-[185px]">
          <div className="mx-auto mb-3.5 grid size-10 place-items-center rounded-xl bg-brand-subtle text-brand-content">
            <Glyph name="people" />
          </div>
          <h3 className="text-[15px] font-bold">근무자가 없습니다.</h3>
          <p className="mt-2.5 mb-[18px] text-[11px] leading-[1.9] text-content-tertiary">
            근무 시작일부터 이름이 표시됩니다.
            <br />
            처음에는 미배정으로 표시되며 <br />
            원하는 날에 근무를 배정할 수 있습니다.
          </p>
          <Button
            size="sm"
            onClick={() =>
              open({
                kind: "employee",
                startDate: "",
                name: "",
                color: colors[0],
              })
            }
            className="text-xs/normal"
          >
            <FaPlus /> 근무자 추가
          </Button>
          {/* {!hasEmployees && (
            <button
              className="mx-auto mt-[13px] block border-0 bg-transparent text-[10px] text-content-tertiary"
              onClick={loadExample}
            >
              예시 근무표 먼저 둘러보기 ↗
            </button>
          )} */}
        </div>
      )}
    </section>
  );
};
