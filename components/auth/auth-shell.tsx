import Link from "next/link";
import { FaCalendarDays, FaCheck } from "react-icons/fa6";
import type { ReactNode } from "react";

export const AuthShell = ({ children }: { children: ReactNode }) => {
  return (
    <main className="grid min-h-dvh bg-canvas text-content lg:grid-cols-[minmax(0,1fr)_minmax(480px,1fr)]">
      <section
        className="relative flex flex-col overflow-hidden bg-brand-subtle p-8 sm:p-12 lg:p-16"
        aria-label="ShiftFit 소개"
      >
        <Link
          href="/"
          className="flex w-fit items-center gap-2.5 text-2xl font-extrabold tracking-tight text-content"
        >
          <span className="grid size-9 place-items-center rounded-xl bg-brand text-on-brand">
            <FaCalendarDays aria-hidden="true" className="size-5" />
          </span>
          ShiftFit
        </Link>
        <div className="my-auto max-w-lg py-12 lg:py-16">
          <p className="mb-5 text-xs font-semibold tracking-[0.16em] text-brand-content">
            MAKE EVERY SHIFT FIT
          </p>
          <h2 className="text-3xl font-bold leading-snug tracking-tight sm:text-4xl">
            ShiftFit으로 더 편하게 <br />
            근무표를 작성해보세요.
          </h2>
          <p className="mt-5 text-sm leading-7 text-content-secondary">
            근무부터 휴무까지 한눈에 확인하고,
            <br />
            완성한 근무표를 PDF로 간편하게 공유하세요.
          </p>
          <div
            className="mt-10 hidden rounded-2xl border border-line bg-canvas p-5 shadow-sm sm:block"
            aria-hidden="true"
          >
            <div className="mb-5 flex items-center justify-between">
              <span className="text-sm font-bold">우리 팀 근무 캘린더</span>
              <span className="rounded-full bg-brand-subtle px-2.5 py-1 text-[10px] font-semibold text-brand-content">
                한눈에 보기
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {["월", "화", "수"].map((day) => (
                <div key={day} className="rounded-lg bg-canvas-subtle p-3">
                  <p className="mb-3 text-xs text-content-tertiary">{day}</p>
                  <p className="mb-2 rounded border-l-2 border-brand bg-brand-subtle px-2 py-2 text-[11px]">
                    근무자 1 · 오픈
                  </p>
                  <p className="rounded border-l-2 border-success bg-success-subtle px-2 py-2 text-[11px]">
                    근무자 2 · 마감
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-4 flex items-center gap-2 text-[11px] text-content-secondary">
              <FaCheck className="text-success" />
              근무·휴무·연차·기타를 한곳에서 관리
            </p>
          </div>
        </div>
      </section>
      <section
        className="flex items-center justify-center px-6 py-12 sm:px-12 lg:p-16"
        aria-label="계정 인증"
      >
        <div className="w-full max-w-sm">{children}</div>
      </section>
    </main>
  );
};
