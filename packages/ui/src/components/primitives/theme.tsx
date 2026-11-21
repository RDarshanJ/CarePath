"use client";

import { createContext, useContext, type HTMLAttributes, type ReactNode } from "react";
import type { ThemeName } from "../../tokens/tokens";
import { cx } from "../../lib/cx";

const ThemeContext = createContext<ThemeName>("patient");
export const useTheme = (): ThemeName => useContext(ThemeContext);

export interface ThemeScopeProps extends HTMLAttributes<HTMLDivElement> {
  theme: ThemeName;
}

/** Selects the token theme for a subtree and tells portalled overlays which theme to render in. */
export function ThemeScope({ theme, className, children, ...rest }: ThemeScopeProps) {
  return (
    <ThemeContext.Provider value={theme}>
      <div data-theme={theme} className={className} {...rest}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

/**
 * Wrap overlay content rendered through a Radix Portal. Portals mount in document.body, outside the
 * route group's data-theme element, so the wrapper re-applies the theme (display: contents, no layout effect).
 */
export function ThemeWrap({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <div data-theme={theme} className={cx("contents")}>
      {children}
    </div>
  );
}
