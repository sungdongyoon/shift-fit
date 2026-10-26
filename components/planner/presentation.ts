import type { CSSProperties } from "react";

export const tint = (color: string): CSSProperties =>
  ({
    "--shift-color": color,
    "--shift-bg": `${color}13`,
  }) as CSSProperties;
