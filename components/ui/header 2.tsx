"use client";
import { useEffect, useId, useState, type ReactNode } from "react";
import { Dialog } from "./dialog";
import { IconButton } from "./icon-button";
import { Icon } from "./icon";
export type HeaderProps = {
  brand: ReactNode;
  brandHref?: string;
  navigation: readonly {
    label: string;
    href: string;
    current?: boolean;
  }[];
  action?: ReactNode;
  className?: string;
};
export const Header = ({
  brand,
  brandHref = "/",
  navigation,
  action,
  className = "",
}: HeaderProps) => {
  const [open, setOpen] = useState(false);
  const id = useId();
  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const close = () => {
      if (media.matches) setOpen(false);
    };
    media.addEventListener("change", close);
    return () => media.removeEventListener("change", close);
  }, []);
  const links = navigation.map((item) => (
    <a
      key={item.href}
      href={item.href}
      aria-current={item.current ? "page" : undefined}
      onClick={() => setOpen(false)}
      className="inline-flex min-h-11 items-center type-label text-content-secondary hover:text-brand-content"
    >
      {item.label}
    </a>
  ));
  return (
    <header className={`bg-canvas text-content ${className}`}>
      <div className="wds-container flex min-h-16 items-center justify-between gap-4">
        <a href={brandHref} className="type-title-3 text-brand-content">
          {brand}
        </a>
        <nav aria-label="주 메뉴" className="hidden items-center gap-6 sm:flex">
          {links}
          {action}
        </nav>
        <IconButton
          aria-label="메뉴 열기"
          aria-expanded={open}
          aria-controls={id}
          icon={<Icon name="menu" />}
          onClick={() => setOpen(true)}
          className="sm:hidden"
        />
      </div>
      <Dialog
        id={id}
        open={open}
        onOpenChange={setOpen}
        title="메뉴"
        className="mr-0 h-dvh max-h-dvh w-[min(360px,100%)] rounded-none"
      >
        <nav aria-label="모바일 메뉴" className="flex flex-col gap-2">
          {links}
          {action}
        </nav>
      </Dialog>
    </header>
  );
};
