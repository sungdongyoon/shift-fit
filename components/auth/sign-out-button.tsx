"use client";

import type { FormEvent } from "react";
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
  const confirmSignOut = (event: FormEvent<HTMLFormElement>) => {
    if (!window.confirm("로그아웃 하시겠습니까?")) event.preventDefault();
  };

  return (
    <form action={signOut} onSubmit={confirmSignOut}>
      <SubmitButton />
    </form>
  );
};
