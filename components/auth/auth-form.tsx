"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FaCircleCheck } from "react-icons/fa6";
import { submitAuth } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import type { AuthFormState, AuthMode } from "@/lib/auth/forms";
import { PasswordField } from "./password-field";

const copy: Record<
  AuthMode,
  { title: string; description: string; submit: string; pending: string }
> = {
  login: {
    title: "로그인",
    description: "ShiftFit에서 우리 팀의 일정을 이어서 작성하세요.",
    submit: "로그인",
    pending: "로그인 중…",
  },
  signup: {
    title: "회원가입",
    description: "이메일로 가입하고 우리 팀의 근무표를 시작하세요.",
    submit: "회원가입",
    pending: "가입 요청 중…",
  },
  "forgot-password": {
    title: "비밀번호 찾기",
    description: "가입한 이메일로 비밀번호 재설정 링크를 보내드려요.",
    submit: "재설정 메일 보내기",
    pending: "메일 발송 중…",
  },
  "update-password": {
    title: "새 비밀번호 설정",
    description: "앞으로 사용할 새로운 비밀번호를 입력해 주세요.",
    submit: "비밀번호 변경",
    pending: "변경 중…",
  },
};

const initialState: AuthFormState = {};

export const AuthForm = ({
  mode,
  configured,
  notice,
}: {
  mode: AuthMode;
  configured: boolean;
  notice?: string;
}) => {
  const [state, action, pending] = useActionState(
    submitAuth.bind(null, mode),
    initialState,
  );

  const content = copy[mode];
  const needsEmail = mode !== "update-password";
  const needsPassword = mode !== "forgot-password";
  const confirmPassword = mode === "signup" || mode === "update-password";

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{content.title}</h1>
      <p className="mt-3 text-sm leading-6 text-content-secondary">
        {content.description}
      </p>
      {!configured && (
        <p
          role="status"
          className="mt-6 rounded-control bg-warning-subtle px-4 py-3 text-sm leading-6 text-warning"
        >
          인증 서비스 연결을 준비 중이에요. 연결이 완료되면 이용할 수 있어요.
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="mt-6 rounded-control bg-brand-subtle px-4 py-3 text-sm leading-6 text-brand-content"
        >
          {notice}
        </p>
      )}
      <form action={action} className="mt-8 flex flex-col gap-5">
        <fieldset
          disabled={pending || !configured}
          className="flex min-w-0 flex-col gap-5 disabled:opacity-70"
        >
          {needsEmail && (
            <TextField
              id="email"
              name="email"
              label="이메일"
              type="email"
              autoComplete="email"
              maxLength={254}
              required
              defaultValue={state.email}
              placeholder="name@example.com"
            />
          )}
          {needsPassword && (
            <PasswordField
              name="password"
              label="비밀번호"
              autoComplete={
                confirmPassword ? "new-password" : "current-password"
              }
              minLength={confirmPassword ? 8 : undefined}
            />
          )}
          {confirmPassword && (
            <PasswordField
              name="passwordConfirm"
              label="비밀번호 확인"
              autoComplete="new-password"
              minLength={8}
            />
          )}
          {mode === "login" && (
            <Link
              href="/forgot-password"
              className="self-end text-xs text-content-secondary underline underline-offset-4"
            >
              비밀번호를 잊으셨나요?
            </Link>
          )}
          {state.error && (
            <p
              role="alert"
              className="rounded-control bg-danger-subtle px-4 py-3 text-sm leading-6 text-danger"
            >
              {state.error}
            </p>
          )}
          {state.message && (
            <p
              role="status"
              className="flex items-start gap-2 rounded-control bg-success-subtle px-4 py-3 text-sm leading-6 text-success"
            >
              <FaCircleCheck aria-hidden="true" className="mt-1 shrink-0" />
              {state.message}
            </p>
          )}
          <Button
            type="submit"
            disabled={pending || !configured}
            aria-busy={pending}
            className="mt-1 w-full text-sm"
          >
            {pending ? content.pending : content.submit}
          </Button>
        </fieldset>
      </form>
      <div className="mt-7 border-t border-line pt-6 text-center text-sm text-content-secondary">
        {mode === "login" && (
          <p>
            처음 이용하시나요?{" "}
            <Link
              href="/signup"
              className="ml-1 font-semibold text-brand-content"
            >
              회원가입
            </Link>
          </p>
        )}
        {mode === "signup" && (
          <p>
            이미 계정이 있으신가요?{" "}
            <Link
              href="/login"
              className="ml-1 font-semibold text-brand-content"
            >
              로그인
            </Link>
          </p>
        )}
        {(mode === "forgot-password" || mode === "update-password") && (
          <Link href="/login" className="font-semibold text-brand-content">
            로그인으로 돌아가기
          </Link>
        )}
      </div>
    </div>
  );
};
