"use client";

import { useTransition } from "react";
import { usePlannerStore } from "@/providers/planner-provider";
import { signOut } from "@/app/auth/actions";

export const SignOutButton = () => {
  const [pending, startTransition] = useTransition();

  const requestLeave = usePlannerStore((state) => state.requestLeave);

  const confirmSignOut = () => {
    if (pending || !window.confirm("로그아웃 하시겠습니까?")) return;

    requestLeave("로그아웃", () => {
      startTransition(async () => {
        await signOut();
      });
    });
  };

  return (
    <button
      type="button"
      disabled={pending}
      aria-busy={pending}
      onClick={confirmSignOut}
      className="rounded-md border border-line px-3 py-2 text-xs text-content-secondary enabled:hover:bg-surface-hover"
    >
      {pending ? "로그아웃 중…" : "로그아웃"}
    </button>
  );
};
