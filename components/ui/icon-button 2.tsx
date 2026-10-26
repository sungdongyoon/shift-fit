import type { ComponentPropsWithRef, ReactNode } from "react";
export type IconButtonProps = Omit<
  ComponentPropsWithRef<"button">,
  "children"
> & {
  "aria-label": string;
  icon: ReactNode;
};
export const IconButton = ({
  icon,
  type = "button",
  className = "",
  ...props
}: IconButtonProps) => {
  return (
    <button
      {...props}
      type={type}
      className={`inline-flex size-11 shrink-0 items-center justify-center rounded-control text-content-secondary enabled:hover:bg-surface-hover disabled:cursor-not-allowed disabled:text-content-disabled ${className}`}
    >
      <span aria-hidden="true">{icon}</span>
    </button>
  );
};
