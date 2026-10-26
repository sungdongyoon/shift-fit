import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Shiftfit · 우리 팀의 근무 캘린더",
  description:
    "근무부터 휴무까지, 빈틈없이. 직원별 근무 배정과 월 휴무를 한눈에 관리하는 Shiftfit.",
};
const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="ko" data-theme="light">
      <body>{children}</body>
    </html>
  );
};
export default RootLayout;
