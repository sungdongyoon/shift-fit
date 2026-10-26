import type { ComponentPropsWithRef, ReactNode } from "react";
export type RadioProps = Omit<
  ComponentPropsWithRef<"input">,
  "type" | "name" | "value"
> & {
  label: ReactNode;
  name: string;
  value: string;
};
export const Radio = ({ label, className = "", ...props }: RadioProps) => {
  return (
    <label
      className={`inline-flex min-h-11 cursor-pointer items-center gap-3 type-body has-disabled:cursor-not-allowed has-disabled:text-content-disabled ${className}`}
    >
      <span className="relative inline-flex size-6 shrink-0">
        <input
          {...props}
          type="radio"
          className="peer size-6 appearance-none rounded-full border border-line-input bg-surface checked:border-brand checked:bg-brand disabled:border-line disabled:bg-disabled"
        />
        <span className="pointer-events-none absolute top-[7px] left-[7px] hidden size-2.5 rounded-full bg-on-brand peer-checked:block" />
      </span>
      {label}
    </label>
  );
};
