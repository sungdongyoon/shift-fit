import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getAuthConfig } from "@/lib/auth/config";
import { authNotices, type AuthMode } from "@/lib/auth/forms";
import { AuthForm } from "./auth-form";

type AuthScreenProps = {
  mode: AuthMode;
  searchParams: Promise<{ notice?: string }>;
};

export const AuthScreen = async ({ mode, searchParams }: AuthScreenProps) => {
  const [user, params] = await Promise.all([getCurrentUser(), searchParams]);

  if (user && (mode === "login" || mode === "signup") && !params.notice)
    redirect("/");

  if (mode === "update-password" && !user) {
    return (
      <div>
        <h1 className="text-2xl font-bold">재설정 링크를 확인해 주세요</h1>
        <p className="mt-4 text-sm leading-7 text-content-secondary">
          이메일의 비밀번호 재설정 링크로 접속해 주세요. 링크가 만료되었다면
          새로 요청할 수 있어요.
        </p>
        <Link
          href="/forgot-password"
          className="mt-6 inline-block font-semibold text-brand-content"
        >
          재설정 메일 다시 요청하기 →
        </Link>
      </div>
    );
  }

  const notice = params.notice ? authNotices[params.notice] : undefined;

  return (
    <AuthForm
      mode={mode}
      configured={Boolean(getAuthConfig())}
      notice={notice}
    />
  );
};
