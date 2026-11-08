import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthScreen } from "@/components/auth/auth-screen";

export const metadata: Metadata = { title: "새 비밀번호 설정 · ShiftFit" };

const Page = ({ searchParams }: { searchParams: Promise<{ notice?: string }> }) => {
  return (
    <Suspense fallback={<p role="status" className="text-sm text-content-secondary">불러오는 중…</p>}>
      <AuthScreen mode="update-password" searchParams={searchParams} />
    </Suspense>
  );
};

export default Page;
