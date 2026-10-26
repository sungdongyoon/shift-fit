"use client";

import { usePlannerStore } from "@/providers/planner-provider";

const messages = {
  loading: "불러오는 중",
  saved: "모든 변경사항 저장됨",
  blocked: "저장 데이터를 확인해 주세요",
  failed: "저장 실패 · 브라우저 저장 공간을 확인하세요",
};

export const PageHeading = () => {
  const status = usePlannerStore((state) => state.storageStatus);

  return (
    <div className="mb-7 flex items-end justify-between gap-4 max-[640px]:mb-[22px] max-[640px]:block">
      <div>
        <div className="mb-[9px] text-[9px] font-bold tracking-[1.8px] text-brand-content">
          MAKE EVERY SHIFT FIT
        </div>
        <h1 className="text-[27px] leading-[1.45] font-bold tracking-[-1.2px] max-[960px]:text-[23px] max-[640px]:text-[22px]">
          우리 팀의 하루를, 빈틈없이.
        </h1>
        <p className="mt-[7px] text-[13px] text-content-tertiary max-[640px]:text-[11px]">
          근무부터 휴무까지, 한눈에 보고 편하게 계획하세요.
        </p>
      </div>
      <div
        className="flex items-center gap-[7px] pb-[3px] text-[11px] text-content-tertiary max-[960px]:text-[10px] max-[640px]:mt-3.5"
        role="status"
      >
        <span
          className="inline-block size-1.5 rounded-full bg-success data-[error=true]:bg-danger"
          data-error={status === "blocked" || status === "failed"}
        />
        {messages[status]}
      </div>
    </div>
  );
};
