import Link from "next/link";
import type { ComponentProps } from "react";
import { Button, buttonVariants } from "@/components/ui/button";

/**
 * Legacy name kept so older screens keep compiling. It renders the shadcn Button, so every
 * button in the app looks and behaves the same. Prefer `Button` / `buttonVariants` in new code.
 */
export interface PixelButtonProps extends Omit<ComponentProps<typeof Button>, "variant" | "size"> {
  variant?: "primary" | "secondary" | "cyan" | "pink" | "ghost";
  size?: "xs" | "icon" | "sm" | "md" | "lg";
  href?: string;
}

const VARIANT = { primary: "default", cyan: "default", pink: "default", secondary: "outline", ghost: "ghost" } as const;
const SIZE = { xs: "xs", icon: "icon", sm: "sm", md: "default", lg: "lg" } as const;

export function PixelButton({ variant = "primary", size = "md", href, className, children, ...props }: PixelButtonProps) {
  if (href) {
    return <Link href={href} className={buttonVariants({ variant: VARIANT[variant], size: SIZE[size], className: typeof className === "string" ? className : undefined })}>{children}</Link>;
  }
  return <Button variant={VARIANT[variant]} size={SIZE[size]} className={className} {...props}>{children}</Button>;
}
