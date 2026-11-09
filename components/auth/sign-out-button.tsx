"use client";

import { useRef, type FormEvent } from "react";
import { usePlannerStore } from "@/providers/planner-provider";
import { useFormStatus } from "react-dom";
import { signOut } from "@/app/auth/actions";

const SubmitButton = () => {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md border border-line px-3 py-2 text-xs text-content-secondary enabled:hover:bg-surface-hover"
    >
      {pending ? "로그아웃 중…" : "로그아웃"}
    </button>
  );
};

export const SignOutButton = () => {
  const requestLeave = usePlannerStore((state) => state.requestLeave);
  const allowSubmit = useRef(false);

  const confirmSignOut = (event: FormEvent<HTMLFormElement>) => {
    if (allowSubmit.current) {
      allowSubmit.current = false;

      return;
    }
    event.preventDefault();

    if (!window.confirm("로그아웃 하시겠습니까?")) return;

    const form = event.currentTarget;
    requestLeave("로그아웃", () =>
      queueMicrotask(() => {
        allowSubmit.current = true;
        form.requestSubmit();
      }),
    );
  };

  return (
    <form action={signOut} onSubmit={confirmSignOut}>
      <SubmitButton />
    </form>
  );
};
