import type { ComponentProps, ReactNode } from "react";
import NextLink from "next/link";
import { Button, type ButtonProps } from "@carepath/ui";

/** A real link that looks like a button, so navigation is a link and an action is a button. */
export function ButtonLink({
  href,
  children,
  variant = "primary",
  size = "md",
  className,
  ...rest
}: {
  href: string;
  children: ReactNode;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
} & Omit<ComponentProps<typeof NextLink>, "href" | "className" | "children">) {
  return (
    <Button asChild variant={variant} size={size} className={className}>
      <NextLink href={href} {...rest}>
        {children}
      </NextLink>
    </Button>
  );
}
