export type AuthMode =
  | "login"
  | "signup"
  | "forgot-password"
  | "update-password";

export type AuthFormState = {
  error?: string;
  message?: string;
  email?: string;
};

export type AuthInput = { email: string; password: string };

export const validateAuthInput = (
  mode: AuthMode,
  form: FormData,
): AuthInput | string => {
  if (
    !["login", "signup", "forgot-password", "update-password"].includes(mode)
  ) {
    return "요청한 인증 작업을 확인해 주세요.";
  }

  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const needsEmail = mode !== "update-password";

  if (
    needsEmail &&
    (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  ) {
    return "올바른 이메일 주소를 입력해 주세요.";
  }

  if (mode === "forgot-password") return { email, password: "" };

  if (!password || password.length > 72)
    return "비밀번호를 1~72자 이내로 입력해 주세요.";

  if (mode === "signup" || mode === "update-password") {
    if (password.length < 8) return "비밀번호는 8자 이상 입력해 주세요.";
    if (password !== form.get("passwordConfirm"))
      return "비밀번호가 일치하지 않아요.";
  }

  return { email, password };
};

export const authErrorMessage = (code?: string) => {
  const messages: Record<string, string> = {
    invalid_credentials: "이메일 또는 비밀번호를 확인해 주세요.",
    email_not_confirmed: "이메일 인증을 완료한 뒤 로그인해 주세요.",
    weak_password:
      "비밀번호가 보안 기준에 맞지 않아요. 다른 비밀번호를 입력해 주세요.",
    same_password: "기존 비밀번호와 다른 비밀번호를 입력해 주세요.",
    over_request_rate_limit: "요청이 많아요. 잠시 후 다시 시도해 주세요.",
    over_email_send_rate_limit:
      "메일 발송 요청이 많아요. 잠시 후 다시 시도해 주세요.",
    signup_disabled: "현재 회원가입을 이용할 수 없어요.",
    email_address_invalid: "사용할 수 있는 이메일 주소를 입력해 주세요.",
  };

  return (
    messages[code ?? ""] ??
    "요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요."
  );
};

export const authNotices: Record<string, string> = {
  "invalid-link":
    "인증 링크가 만료되었거나 올바르지 않아요. 인증 메일 또는 비밀번호 재설정을 다시 요청해 주세요.",
  "password-updated": "비밀번호를 변경했어요. 새 비밀번호로 로그인해 주세요.",
  "signout-failed": "로그아웃하지 못했어요. 잠시 후 다시 시도해 주세요.",
};
