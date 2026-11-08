"use client";

import { useMemo } from "react";
import { FaTrashCan } from "react-icons/fa6";
import type { SavedMonth } from "@/lib/schedule";
import { usePlannerStore } from "@/providers/planner-provider";

const savedAtLabel = (value: string) => new Date(value).toLocaleString("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export const SavedScheduleList = () => {
  const savedMonths = usePlannerStore((state) => state.data.savedMonths);
  const selectedId = usePlannerStore((state) => state.selectedSavedMonth?.id);
  const showSaved = usePlannerStore((state) => state.showSavedMonth);
  const deleteSaved = usePlannerStore((state) => state.deleteSavedMonth);
  const storageStatus = usePlannerStore((state) => state.storageStatus);
  const showWorking = usePlannerStore((state) => state.showWorkingMonth);

  const records = useMemo(() => [...(savedMonths ?? [])].sort((first, second) =>
    second.month.localeCompare(first.month) || second.version - first.version,
  ), [savedMonths]);

  const confirmDelete = (record: SavedMonth) => {
    const label = `${record.month.slice(0, 4)}년 ${Number(record.month.slice(5))}월 v${record.version}`;
    const confirmed = window.confirm(`${label} 저장 기록을 삭제할까요?\n삭제한 기록은 복구할 수 없으며, 현재 작업 중인 근무표에는 영향을 주지 않아요.`);

    if (confirmed) deleteSaved(record.id);
  };

  return (
    <section className="rounded-control bg-canvas-subtle p-3" aria-label="저장 기록">
      <h3 className="text-[11px] font-semibold">저장 기록</h3>
      {records.length ? (
        <div className="mt-3 flex max-h-72 flex-col gap-2 overflow-y-auto">
          {records.map((record) => (
            <div
              key={record.id}
              data-selected={selectedId === record.id}
              className="flex items-start rounded-md border border-line bg-surface data-[selected=true]:border-brand data-[selected=true]:bg-brand-subtle"
            >
              <button
                type="button"
                aria-pressed={selectedId === record.id}
                onClick={() => showSaved(record.id)}
                className="min-w-0 flex-1 rounded-md px-2.5 py-2 text-left hover:bg-surface-hover"
              >
                <span className="block text-xs font-semibold">
                  {Number(record.month.slice(5))}월 v{record.version}
                </span>
                <span className="mt-1 block text-[9px] leading-relaxed text-content-tertiary">
                  {record.month.slice(0, 4)}년 · {record.data.employees.length}명
                  <br />{savedAtLabel(record.savedAt)}
                </span>
              </button>
              <button
                type="button"
                aria-label={`${record.month.slice(0, 4)}년 ${Number(record.month.slice(5))}월 v${record.version} 저장 기록 삭제`}
                title="저장 기록 삭제"
                disabled={storageStatus === "loading" || storageStatus === "blocked"}
                onClick={() => confirmDelete(record)}
                className="m-1 flex size-7 shrink-0 items-center justify-center rounded-md text-content-tertiary enabled:hover:bg-danger-subtle enabled:hover:text-danger disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FaTrashCan aria-hidden="true" className="size-3" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-[10px] leading-relaxed text-content-tertiary">
          저장한 근무표가 없어요. 상단 저장 버튼으로 현재 월의 기록을 남겨보세요.
        </p>
      )}
      {selectedId && (
        <button type="button" onClick={showWorking} className="mt-3 w-full rounded-md border border-line bg-surface px-2 py-2 text-[11px] font-medium">
          현재 작업본으로 돌아가기
        </button>
      )}
      <p className="mt-3 text-[9px] leading-relaxed text-content-tertiary">
        저장본은 읽기 전용이에요. 기록은 현재 브라우저에 보관돼요.
      </p>
    </section>
  );
};
