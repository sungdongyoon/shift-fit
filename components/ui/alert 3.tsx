import type { ReactNode } from "react";
import { toneClasses } from "./badge";
import { Icon } from "./icon";
export type AlertProps = {
  tone?: "info" | "success" | "warning" | "danger";
  title: string;
  description?: ReactNode;
  urgent?: boolean;
  className?: string;
};
export function Alert({
  tone = "info",
  title,
  description,
  urgent = false,
  className = "",
}: AlertProps) {
  return (
    <div
      role={urgent ? "alert" : "status"}
      aria-atomic="true"
      className={`flex items-center gap-3 rounded-xl p-4 ${toneClasses[tone === "info" ? "brand" : tone]} ${className}`}
    >
      <Icon
        name={
          tone === "success" ? "check" : tone === "danger" ? "close" : "plus"
        }
      />
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
}
