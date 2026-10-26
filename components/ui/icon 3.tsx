import type { CSSProperties } from "react";
export type IconName =
  | "search"
  | "check"
  | "chevron-down"
  | "chevron-right"
  | "menu"
  | "plus"
  | "close";
const sources: Record<IconName, string> = {
  search: "actions-imgFrame",
  check: "forms-imgFrame",
  "chevron-down": "forms-imgFrame2",
  "chevron-right": "patterns-imgFrame10",
  menu: "patterns-imgFrame",
  plus: "patterns-imgFrame4",
  close: "patterns-imgFrame6",
};
/** Original Figma SVG silhouette, colored using the inherited WDS semantic token. */
export function Icon({
  name,
  className = "",
}: {
  name: IconName;
  className?: string;
}) {
  const url = `url("/wds/${sources[name]}.svg")`;
  return (
    <span
      aria-hidden="true"
      className={`inline-block size-6 shrink-0 bg-current ${className}`}
      style={
        {
          maskImage: url,
          WebkitMaskImage: url,
          maskRepeat: "no-repeat",
          maskPosition: "center",
          maskSize: "24px 24px",
        } as CSSProperties
      }
    />
  );
}
