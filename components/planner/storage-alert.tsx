"use client";

import { usePlannerStore } from "@/providers/planner-provider";

export const StorageAlert = () => {
  const status = usePlannerStore((state) => state.storageStatus);
  const error = usePlannerStore((state) => state.persistenceError);
  const reload = usePlannerStore((state) => state.loadSchedule);
  const requestLeave = usePlannerStore((state) => state.requestLeave);

  if (!error) return null;

  const reloadLatest = () =>
    requestLeave("최신 근무표 다시 불러오기", () => void reload());

  return (
    <div
      role="alert"
      className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-control bg-danger-subtle px-4 py-3 text-xs/normal text-danger"
    >
      <span>
        {error}
        {status === "failed" && " 작성한 내용은 화면에 유지돼요."}
      </span>
      <button
        type="button"
        onClick={reloadLatest}
        className="shrink-0 underline underline-offset-2"
      >
        {status === "blocked" ? "다시 불러오기" : "최신 근무표 불러오기"}
      </button>
    </div>
  );
};
