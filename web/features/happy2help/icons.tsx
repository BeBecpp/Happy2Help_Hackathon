import type { SVGProps } from "react";
import type { Category } from "./types";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const base = ({ size = 22, ...props }: IconProps) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  ...props,
});

/** Original line icons, one visual family for the whole app. */
export const Icon = {
  Home: (p: IconProps) => (
    <svg {...base(p)}><path d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z" /></svg>
  ),
  List: (p: IconProps) => (
    <svg {...base(p)}><path d="M5 7h14M5 12h14M5 17h9" /><circle cx="19" cy="17" r="1" fill="currentColor" stroke="none" /></svg>
  ),
  Heart: (p: IconProps) => (
    <svg {...base(p)}><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></svg>
  ),
  Arrow: (p: IconProps) => (
    <svg {...base(p)}><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
  ),
  Back: (p: IconProps) => (
    <svg {...base(p)}><path d="M19 12H5m6 6-6-6 6-6" /></svg>
  ),
  Check: (p: IconProps) => (
    <svg {...base(p)}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
  ),
  Refresh: (p: IconProps) => (
    <svg {...base(p)}><path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5" /></svg>
  ),
  Pin: (p: IconProps) => (
    <svg {...base(p)}><path d="M12 21s6-5.7 6-11a6 6 0 0 0-12 0c0 5.3 6 11 6 11z" /><circle cx="12" cy="10" r="2.2" /></svg>
  ),
  Clock: (p: IconProps) => (
    <svg {...base(p)}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>
  ),
  Spark: (p: IconProps) => (
    <svg {...base(p)}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" /></svg>
  ),
  SignOut: (p: IconProps) => (
    <svg {...base(p)}><path d="M10 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M15 8l4 4-4 4M19 12H9" /></svg>
  ),
  Shield: (p: IconProps) => (
    <svg {...base(p)}><path d="M12 3 5 6v6c0 4.4 3 7.6 7 9 4-1.4 7-4.6 7-9V6z" /><path d="m9 12 2 2 4-4" /></svg>
  ),
  Folder: (p: IconProps) => (
    <svg {...base(p)}><path d="M3 7a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" /></svg>
  ),
  // category icons
  Bullying: (p: IconProps) => (
    <svg {...base(p)}><circle cx="9" cy="8" r="3" /><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" /><path d="m16 6 4 4m0-4-4 4" /></svg>
  ),
  Unsafe: (p: IconProps) => (
    <svg {...base(p)}><path d="M12 3.5 21 19.5H3z" /><path d="M12 10v4M12 17h.01" /></svg>
  ),
  Wellbeing: (p: IconProps) => (
    <svg {...base(p)}><path d="M4 13c2.5-3 5-3 7.5 0M12.5 13c2.5-3 5-3 7.5 0" /><circle cx="12" cy="12" r="9" /><path d="M9 16c1.8 1.4 4.2 1.4 6 0" /></svg>
  ),
  Other: (p: IconProps) => (
    <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.5V14M12 17h.01" /></svg>
  ),
};

export function CategoryIcon({ category, size = 26 }: { category: Category; size?: number }) {
  const C =
    category === "BULLYING" ? Icon.Bullying
    : category === "UNSAFE" || category === "URGENT" ? Icon.Unsafe
    : category === "WELLBEING" ? Icon.Wellbeing
    : category === "MEDICAL" ? Icon.Heart
    : category === "RULE" ? Icon.Shield
    : Icon.Other;
  return <C size={size} />;
}
