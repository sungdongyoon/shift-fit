import type { SupabaseClient } from "@supabase/supabase-js";
import { authErrorMessage, type AuthInput, type AuthMode } from "./forms";

export type AuthClient = Pick<
  SupabaseClient["auth"],
  | "signInWithPassword"
  | "signUp"
  | "resetPasswordForEmail"
  | "getUser"
  | "updateUser"
  | "signOut"
>;

export type AuthResult = {
  error?: string;
  message?: string;
  destination?: "/" | "/login?notice=password-updated";
};

export const runAuthRequest = async (
  mode: AuthMode,
  input: AuthInput,
  auth: AuthClient,
  siteUrl: string,
): Promise<AuthResult> => {
  if (mode === "login") {
    const { error } = await auth.signInWithPassword(input);

    return error
      ? { error: authErrorMessage(error.code) }
      : { destination: "/" };
  }

  if (mode === "signup") {
    const { data, error } = await auth.signUp({
      ...input,
      options: { emailRedirectTo: `${siteUrl}/auth/callback` },
    });

    if (error) return { error: authErrorMessage(error.code) };
    if (data.session) return { destination: "/" };

    return {
      message:
        "가입 가능한 이메일이면 인증 메일이 발송돼요. 받은 편지함에서 인증 링크를 눌러 가입을 완료해 주세요.",
    };
  }

  if (mode === "forgot-password") {
    const { error } = await auth.resetPasswordForEmail(input.email, {
      redirectTo: `${siteUrl}/auth/callback?next=/update-password`,
    });

    return error
      ? { error: authErrorMessage(error.code) }
      : {
          message:
            "등록된 이메일이면 재설정 링크를 보내드려요. 받은 편지함과 스팸함을 확인해 주세요.",
        };
  }

  const { data: userData, error: userError } = await auth.getUser();

  if (userError || !userData.user)
    return {
      error:
        "재설정 링크가 만료되었어요. 비밀번호 재설정을 다시 요청해 주세요.",
    };

  const { error } = await auth.updateUser({ password: input.password });

  if (error) return { error: authErrorMessage(error.code) };

  const { error: signOutError } = await auth.signOut({ scope: "local" });

  if (signOutError)
    return {
      message:
        "비밀번호를 변경했어요. 로그아웃 후 새 비밀번호로 로그인해 주세요.",
    };

  return { destination: "/login?notice=password-updated" };
};
