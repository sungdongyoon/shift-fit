"use client";
import { Alert, type AlertProps } from "./alert";
import { IconButton } from "./icon-button";
import { Icon } from "./icon";
export type ToastProps = Omit<AlertProps, "className"> & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
};
/** Persistent until dismissed: essential actions are never lost to a timer. Position via className. */
export function Toast({
  open,
  onOpenChange,
  className = "",
  ...props
}: ToastProps) {
  return (
    <div
      className={className}
      aria-live={props.urgent ? "assertive" : "polite"}
      aria-atomic="true"
    >
      {open && (
        <div className="relative">
          <Alert {...props} className="min-h-16 pr-16 shadow-overlay" />
          <IconButton
            aria-label="알림 닫기"
            icon={<Icon name="close" />}
            onClick={() => onOpenChange(false)}
            className="absolute top-2 right-2"
          />
        </div>
      )}
    </div>
  );
}
