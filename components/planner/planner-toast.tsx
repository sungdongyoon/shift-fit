"use client";

import { useEffect } from "react";
import { usePlannerStore } from "@/providers/planner-provider";

export const PlannerToast = () => {
  const toast = usePlannerStore((state) => state.toast);
  const dismiss = usePlannerStore((state) => state.dismissToast);
  const undo = usePlannerStore((state) => state.undoLastChange);

  useEffect(() => {
    if (!toast || toast.undo) return;
    const timer = setTimeout(dismiss, 6000);
    return () => clearTimeout(timer);
  }, [toast, dismiss]);

  if (!toast) return null;

  return (
    <div
      className="fixed bottom-6 left-1/2 z-5 flex max-w-[calc(100vw-32px)] -translate-x-1/2 items-center gap-[18px] rounded-[10px] bg-content px-[18px] py-3.5 text-xs/normal text-canvas shadow-[0_6px_30px_#0002] max-[640px]:bottom-4 max-[640px]:gap-2.5 max-[640px]:p-3 max-[640px]:text-[11px]"
      role="status"
    >
      <span className="leading-[1.6]">{toast.message}</span>
      {toast.undo && (
        <button
          onClick={undo}
          className="shrink-0 border-0 bg-transparent [&:first-of-type]:font-semibold [&:first-of-type]:text-[#9ec5ff] last:text-lg/normal"
        >
          실행 취소
        </button>
      )}
      <button
        aria-label="알림 닫기"
        onClick={dismiss}
        className="shrink-0 border-0 bg-transparent [&:first-of-type]:font-semibold [&:first-of-type]:text-[#9ec5ff] last:text-lg/normal"
      >
        ×
      </button>
    </div>
  );
};
