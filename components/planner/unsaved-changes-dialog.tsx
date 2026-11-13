"use client";

import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usePlannerStore } from "@/providers/planner-provider";

export const UnsavedChangesDialog = () => {
  const pending = usePlannerStore((state) => state.pendingNavigation);
  const resolve = usePlannerStore((state) => state.resolveNavigation);
  const saving = usePlannerStore((state) => state.storageStatus === "saving");
  const error = usePlannerStore((state) => state.persistenceError);
  const conflict = usePlannerStore((state) => state.conflict);

  return (
    <Dialog
      className="[&_h2]:text-base [&_h2]:leading-6 [&_p]:text-xs [&_p]:leading-5 [&_button]:text-xs"
      open={Boolean(pending)}
      onOpenChange={(open) => {
        if (!open) void resolve("cancel");
      }}
      title="저장하지 않은 변경사항이 있어요"
      description={`${pending?.label ?? "이동"} 전에 변경사항을 저장할까요? 직원·근무 타입·일정 등 저장 이후의 모든 변경사항에 적용됩니다.`}
      footer={
        <>
          <Button
            appearance="text"
            size="sm"
            disabled={saving}
            onClick={() => void resolve("cancel")}
          >
            계속 작성
          </Button>
          <Button
            appearance="outline"
            size="sm"
            disabled={saving}
            onClick={() => void resolve("discard")}
          >
            저장하지 않고 이동
          </Button>
          <Button
            size="sm"
            disabled={saving || conflict}
            onClick={() => void resolve("save")}
          >
            {saving ? "저장 중…" : "저장 후 이동"}
          </Button>
        </>
      }
    >
      {error && (
        <p role="alert" className="text-sm leading-6 text-danger">
          {error}
        </p>
      )}
    </Dialog>
  );
};
