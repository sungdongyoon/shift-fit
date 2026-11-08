import test from "node:test";
import assert from "node:assert/strict";
import {
  validateAuthInput,
  authErrorMessage,
  type AuthMode,
} from "../lib/auth/forms";
import { runAuthRequest, type AuthClient } from "../lib/auth/requests";
import { getAuthConfig, getSiteUrl } from "../lib/auth/config";

const form = (values: Record<string, string>) => {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => data.set(key, value));

  return data;
};

const credentials = {
  email: "manager@example.com",
  password: "password-test-123",
};

const mockAuth = (overrides: Record<string, unknown> = {}) => {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const methods = Object.fromEntries(
    [
      "signInWithPassword",
      "signUp",
      "resetPasswordForEmail",
      "getUser",
      "updateUser",
      "signOut",
    ].map((method) => [
      method,
      async (...args: unknown[]) => {
        calls.push({ method, args });

        return (
          overrides[method] ?? {
            data: { user: { id: "test-user" }, session: null },
            error: null,
          }
        );
      },
    ]),
  );

  return { auth: methods as unknown as AuthClient, calls };
};

test("이메일·비밀번호 확인은 서버에서 검사하고 비밀번호 공백은 보존한다", () => {
  const valid = {
    ...credentials,
    email: " manager@example.com ",
    password: " password-test ",
    passwordConfirm: " password-test ",
  };
  assert.deepEqual(validateAuthInput("signup", form(valid)), {
    email: credentials.email,
    password: valid.password,
  });
  assert.equal(
    typeof validateAuthInput(
      "signup",
      form({ ...valid, passwordConfirm: "different" }),
    ),
    "string",
  );
  assert.equal(
    typeof validateAuthInput("signup", form({ ...valid, password: "short" })),
    "string",
  );
  assert.equal(
    typeof validateAuthInput("login", form({ ...valid, email: "invalid" })),
    "string",
  );
  assert.equal(
    typeof validateAuthInput(
      "login",
      form({ ...valid, password: "x".repeat(73) }),
    ),
    "string",
  );
  assert.equal(
    typeof validateAuthInput("unknown" as AuthMode, form(valid)),
    "string",
  );
  assert.deepEqual(
    validateAuthInput("forgot-password", form({ email: credentials.email })),
    { email: credentials.email, password: "" },
  );
});

test("로그인 성공 시 근무표로 이동하고 인증 실패는 안전한 한국어 메시지로 반환한다", async () => {
  const success = mockAuth();
  assert.deepEqual(
    await runAuthRequest(
      "login",
      credentials,
      success.auth,
      "https://shiftfit.example",
    ),
    { destination: "/" },
  );
  assert.equal(success.calls[0].method, "signInWithPassword");
  const failure = mockAuth({
    signInWithPassword: {
      error: { code: "invalid_credentials", message: "private server details" },
    },
  });
  const result = await runAuthRequest(
    "login",
    credentials,
    failure.auth,
    "https://shiftfit.example",
  );
  assert.equal(result.error, "이메일 또는 비밀번호를 확인해 주세요.");
  assert.equal(
    JSON.stringify(result).includes("private server details"),
    false,
  );
  assert.ok(authErrorMessage("email_not_confirmed").includes("인증"));
});

test("회원가입 인증 링크는 고정 콜백으로 보내며 세션이 없으면 인증 메일을 안내한다", async () => {
  const { auth, calls } = mockAuth();
  const result = await runAuthRequest(
    "signup",
    credentials,
    auth,
    "https://shiftfit.example",
  );
  assert.ok(result.message?.includes("인증 메일"));
  assert.equal(result.destination, undefined);
  assert.deepEqual(calls[0].args, [
    {
      ...credentials,
      options: { emailRedirectTo: "https://shiftfit.example/auth/callback" },
    },
  ]);
  const autoConfirmed = mockAuth({
    signUp: { data: { session: { access_token: "test-token" } }, error: null },
  });
  assert.deepEqual(
    await runAuthRequest(
      "signup",
      credentials,
      autoConfirmed.auth,
      "https://shiftfit.example",
    ),
    { destination: "/" },
  );
});

test("재설정 메일은 계정 존재 여부를 노출하지 않으며 비밀번호 설정으로 연결한다", async () => {
  const { auth, calls } = mockAuth();
  const result = await runAuthRequest(
    "forgot-password",
    credentials,
    auth,
    "https://shiftfit.example",
  );
  assert.ok(result.message?.includes("등록된 이메일이면"));
  assert.deepEqual(calls[0], {
    method: "resetPasswordForEmail",
    args: [
      credentials.email,
      {
        redirectTo:
          "https://shiftfit.example/auth/callback?next=/update-password",
      },
    ],
  });
  assert.equal(calls.length, 1);
});

test("비밀번호 변경은 서버 확인된 사용자만 허용하고 성공 시 현재 세션을 종료한다", async () => {
  const { auth, calls } = mockAuth();
  assert.deepEqual(
    await runAuthRequest(
      "update-password",
      credentials,
      auth,
      "https://shiftfit.example",
    ),
    { destination: "/login?notice=password-updated" },
  );
  assert.deepEqual(
    calls.map((call) => call.method),
    ["getUser", "updateUser", "signOut"],
  );
  assert.deepEqual(calls[2].args, [{ scope: "local" }]);
  const expired = mockAuth({
    getUser: { data: { user: null }, error: { code: "session_not_found" } },
  });
  const result = await runAuthRequest(
    "update-password",
    credentials,
    expired.auth,
    "https://shiftfit.example",
  );
  assert.ok(result.error?.includes("만료"));
  assert.equal(expired.calls.length, 1);
});

test("재설정 실패·메일 발송 제한을 성공으로 표시하지 않는다", async () => {
  const limited = mockAuth({
    resetPasswordForEmail: { error: { code: "over_email_send_rate_limit" } },
  });
  assert.ok(
    (
      await runAuthRequest(
        "forgot-password",
        credentials,
        limited.auth,
        "https://shiftfit.example",
      )
    ).error?.includes("잠시 후"),
  );
  const weak = mockAuth({ updateUser: { error: { code: "weak_password" } } });
  assert.ok(
    (
      await runAuthRequest(
        "update-password",
        credentials,
        weak.auth,
        "https://shiftfit.example",
      )
    ).error,
  );
  assert.equal(
    weak.calls.some((call) => call.method === "signOut"),
    false,
  );
});

test("인증 설정은 공개 키와 HTTPS 주소를 사용하며 위험한 주소를 거부한다", () => {
  const previous = { ...process.env };

  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_example";
    assert.equal(getAuthConfig()?.url, "https://project.supabase.co");
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_secret_example";
    assert.equal(getAuthConfig(), null);
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_example";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://untrusted.example";
    assert.equal(getAuthConfig(), null);
    process.env.NEXT_PUBLIC_SITE_URL = "ftp://localhost";
    assert.throws(getSiteUrl);
    process.env.NEXT_PUBLIC_SITE_URL = "https://shiftfit.example/path";
    assert.equal(getSiteUrl(), "https://shiftfit.example");
  } finally {
    process.env = previous;
  }
});
