"use client";

import { usePlannerStore } from "@/providers/planner-provider";
import { STORAGE_KEY } from "@/stores/planner-storage";

export const StorageAlert = () => {
  const blocked = usePlannerStore((state) => state.storageStatus === "blocked");
  const notify = usePlannerStore((state) => state.notify);

  const download = () => {
    try {
      const blob = new Blob([localStorage.getItem(STORAGE_KEY) ?? ""], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "shiftfit-backup.json";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      notify(
        "기존 데이터를 내려받지 못했어요. 브라우저 저장소 접근을 확인해 주세요.",
      );
    }
  };

  if (!blocked) return null;

  return (
    <div
      className="mb-4 rounded-control bg-danger-subtle px-4 py-3 text-xs/normal text-danger"
      role="alert"
    >
      기존 저장 데이터를 읽지 못했어요. 덮어쓰기를 막기 위해 자동 저장을
      멈췄어요.{" "}
      <button onClick={download} className="ml-2.5 underline">
        기존 데이터 내려받기
      </button>
    </div>
  );
};
