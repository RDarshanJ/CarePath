import type { SVGProps } from "react";

/** Small stroke icon set drawn for CarePath: 24 px grid, 1.75 px stroke, square caps. No decoration, no sparkles. */
const paths = {
  check: "M5 12.5l4.5 4.5L19 7.5",
  "check-circle": "M12 21a9 9 0 100-18 9 9 0 000 18zM8 12.5l3 3 5-6",
  "alert-triangle": "M12 4l9 16H3L12 4zM12 10v4.5M12 17.25v.01",
  "alert-circle": "M12 21a9 9 0 100-18 9 9 0 000 18zM12 7.5v5.5M12 16v.01",
  info: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 11v5.5M12 8v.01",
  x: "M6 6l12 12M18 6L6 18",
  "chevron-down": "M6 9.5l6 6 6-6",
  "chevron-up": "M6 14.5l6-6 6 6",
  "chevron-right": "M9.5 6l6 6-6 6",
  "arrow-up": "M12 19V5M6 11l6-6 6 6",
  "arrow-down": "M12 5v14M6 13l6 6 6-6",
  "arrows-sort": "M8 5v14M4 9l4-4 4 4M16 19V5M12 15l4 4 4-4",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  search: "M10.5 17a6.5 6.5 0 100-13 6.5 6.5 0 000 13zM20 20l-4.9-4.9",
  calendar: "M4 6.5h16V20H4zM4 10.5h16M8 4v4M16 4v4",
  clock: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5.5l3.5 2",
  message: "M4 5h16v11H9.5L5 20v-4H4z",
  home: "M4 11l8-7 8 7M6 9.5V20h12V9.5",
  clipboard: "M8 5H5.5v15h13V5H16M8 3.5h8V7H8zM8.5 12h7M8.5 16h5",
  user: "M12 12a4 4 0 100-8 4 4 0 000 8zM4.5 20a7.5 7.5 0 0115 0",
  users:
    "M9 11.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM2.5 20a6.5 6.5 0 0113 0M16 4.8a3.5 3.5 0 010 6.4M17.5 14a6.5 6.5 0 014 6",
  settings: "M4 7h9M17 7h3M4 17h3M11 17h9M15 4.5v5M9 14.5v5",
  activity: "M3 12h4l3-7 4 14 3-7h4",
  more: "M5 12v.01M12 12v.01M19 12v.01",
  play: "M8 5l11 7-11 7z",
  pause: "M8 5v14M16 5v14",
  file: "M6 3.5h8l4 4V20.5H6zM14 3.5V8h4M9 13h6M9 16.5h6",
  link: "M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3A4 4 0 0011 18.7l1-1",
  lock: "M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 017 0v3",
  phone:
    "M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a1 1 0 01-1 1C10.7 20 4 13.3 4 5a1 1 0 011-1z",
  dot: "M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z",
  list: "M9 6h11M9 12h11M9 18h11M4.5 6v.01M4.5 12v.01M4.5 18v.01",
  evidence: "M5 4h10l4 4v12H5zM15 4v4h4M8.5 13h7M8.5 16.5h4",
} as const;

export type IconName = keyof typeof paths;

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  size?: number;
  /** Provide only when the icon is the sole content of its control. Otherwise the icon is hidden from assistive tech. */
  title?: string;
}

export function Icon({ name, size = 18, title, className, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="square"
      strokeLinejoin="miter"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
      className={className}
      {...rest}
    >
      <path d={paths[name]} />
    </svg>
  );
}

export const iconNames = Object.keys(paths) as IconName[];
