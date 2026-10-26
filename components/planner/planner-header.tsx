import { Glyph } from "./glyph";

export const PlannerHeader = () => (
  <header className="flex h-[76px] items-center gap-[72px] border-b border-line bg-canvas px-10 max-[1200px]:gap-10 max-[1200px]:px-6 max-[640px]:h-16 max-[640px]:gap-6 max-[640px]:px-4">
    <a
      className="flex items-center gap-[9px] text-[27px] font-extrabold tracking-[-1.5px] text-content no-underline max-[640px]:text-[23px]"
      href="/"
      aria-label="Shiftfit 홈"
    >
      <span className="grid size-8 place-items-center rounded-[10px] bg-brand text-on-brand">
        <Glyph name="grid" className="size-5" />
      </span>
      shiftfit
      <span className="ml-[3px] self-center rounded border border-line px-[5px] py-[3px] text-[9px] tracking-[0.6px] text-content-tertiary max-[640px]:hidden">
        BETA
      </span>
    </a>
    <nav
      aria-label="주 메뉴"
      className="flex self-stretch items-stretch max-[640px]:text-[11px]"
    >
      <span className="flex items-center gap-[9px] border-b-2 border-brand px-[5px] font-semibold text-brand-content">
        <Glyph name="calendar" />
        근무 캘린더
      </span>
    </nav>
    <span className="ml-auto flex items-center gap-[9px] text-xs/normal text-content-secondary max-[640px]:hidden">
      <span className="grid size-[30px] place-items-center rounded-[9px] border border-line bg-canvas-subtle font-bold">
        S
      </span>{" "}
      나의 워크스페이스
    </span>
  </header>
);
