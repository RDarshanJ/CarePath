import type { ComponentProps } from "react";
import NextLink from "next/link";
import { cx } from "@carepath/ui";

/** In-app text link: client navigation, the design system's link look and focus ring. */
export function TextLink({ className, ...rest }: ComponentProps<typeof NextLink>) {
  return (
    <NextLink
      className={cx(
        "rounded-control text-label font-medium text-primary underline underline-offset-2 hover:decoration-2 focus-visible:focus-ring",
        className,
      )}
      {...rest}
    />
  );
}
