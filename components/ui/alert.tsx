import type { ReactNode } from "react";
import { toneClasses } from "./badge";
import { Icon, type IconName } from "./icon";

export type AlertProps = {
  tone?: "info" | "success" | "warning" | "danger";
  title: string;
  description?: ReactNode;
  urgent?: boolean;
  className?: string;
};

const toneIcons: Record<NonNullable<AlertProps["tone"]>, IconName> = {
  info: "plus",
  success: "check",
  warning: "plus",
  danger: "close",
};

export const Alert = ({
  tone = "info",
  title,
  description,
  urgent = false,
  className = "",
}: AlertProps) => {
  return (
    <div
      role={urgent ? "alert" : "status"}
      aria-atomic="true"
      className={`flex items-center gap-3 rounded-xl p-4 ${toneClasses[tone === "info" ? "brand" : tone]} ${className}`}
    >
      <Icon name={toneIcons[tone]} />
      <div className="min-w-0 space-y-1">
        <p className="type-label">{title}</p>
        {description && (
          <div className="type-body-small text-content-secondary">
            {description}
          </div>
        )}
      </div>
    </div>
  );
};
