"use client";
export type PaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  label?: string;
  className?: string;
};
export const Pagination = ({
  page,
  totalPages,
  onPageChange,
  label = "페이지 이동",
  className = "",
}: PaginationProps) => {
  const total = Number.isFinite(totalPages)
    ? Math.max(0, Math.floor(totalPages))
    : 0;
  if (!total) return null;
  const current = Number.isFinite(page)
    ? Math.min(total, Math.max(1, Math.floor(page)))
    : 1;
  const start = Math.max(1, Math.min(current - 1, total - 3));
  const pages = Array.from(
    { length: Math.min(4, total) },
    (_, index) => start + index,
  );
  const base =
    "inline-flex min-w-11 h-11 items-center justify-center rounded-control px-2 type-label disabled:text-content-disabled disabled:cursor-not-allowed";
  return (
    <nav
      aria-label={label}
      className={`flex flex-wrap items-center gap-1 ${className}`}
    >
      <button
        type="button"
        aria-label="이전 페이지"
        disabled={current === 1}
        onClick={() => onPageChange(current - 1)}
        className={`${base} enabled:hover:bg-surface-hover`}
      >
        ‹
      </button>
      {pages.map((number) => (
        <button
          key={number}
          type="button"
          aria-label={`${number}페이지`}
          aria-current={number === current ? "page" : undefined}
          onClick={() => onPageChange(number)}
          className={`${base} ${number === current ? "bg-brand text-on-brand" : "text-content-secondary hover:bg-surface-hover"}`}
        >
          {number}
        </button>
      ))}
      <button
        type="button"
        aria-label="다음 페이지"
        disabled={current === total}
        onClick={() => onPageChange(current + 1)}
        className={`${base} enabled:hover:bg-surface-hover`}
      >
        ›
      </button>
    </nav>
  );
};
