import type { ReactNode } from "react";

type PanelHeadingProps = {
  title: string;
  count?: number;
  children?: ReactNode;
};

export const PanelHeading = ({ title, count, children }: PanelHeadingProps) => (
  <div className="flex items-center justify-between gap-2">
    <h2 className="flex items-center gap-[7px] text-sm/normal font-bold">
      {title}
      {count !== undefined && (
        <span className="rounded-[5px] bg-canvas-subtle px-1.5 py-0.5 text-[11px] text-content-tertiary">
          {count}
        </span>
      )}
    </h2>
    {children}
  </div>
);
