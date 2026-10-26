"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button } from "./button";
export type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
  id?: string;
};
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className = "",
  id,
}: DialogProps) {
  const generated = useId();
  const titleId = `${generated}-title`;
  const descriptionId = `${generated}-description`;
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (!open) {
      if (dialog.open) dialog.close();
      return;
    }
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      if (previous?.isConnected) previous.focus();
    };
  }, [open]);
  return (
    <dialog
      ref={ref}
      id={id}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      aria-modal="true"
      onCancel={(event) => {
        event.preventDefault();
        onOpenChange(false);
      }}
      onClose={() => {
        if (open) onOpenChange(false);
      }}
      className={`fixed inset-0 m-auto max-h-[calc(100dvh-40px)] w-[calc(100%-40px)] max-w-[440px] overflow-y-auto rounded-dialog border border-line bg-surface p-8 text-content shadow-overlay backdrop:bg-black/40 ${className}`}
    >
      <div className="space-y-6">
        <h2 id={titleId} className="type-title-3">
          {title}
        </h2>
        {description && (
          <p id={descriptionId} className="type-body text-content-secondary">
            {description}
          </p>
        )}
        {children}
        <div className="flex flex-wrap justify-end gap-3">
          {footer ?? (
            <Button appearance="outline" onClick={() => onOpenChange(false)}>
              닫기
            </Button>
          )}
        </div>
      </div>
    </dialog>
  );
}
