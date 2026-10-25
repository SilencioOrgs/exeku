import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const badgeVariants = cva(
  "group/badge inline-flex min-h-5 w-fit shrink-0 items-center justify-center gap-1 rounded-[var(--radius-btn)] border px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-border bg-secondary text-foreground",
        outline: "border-border bg-transparent text-foreground",
        ghost: "border-transparent text-muted-foreground hover:bg-muted",
        destructive: "border-destructive/30 bg-destructive/10 text-destructive",
        success: "border-[var(--color-mint)]/30 bg-[var(--color-elevated)] text-[var(--color-mint)]",
        warning: "border-[var(--color-warning)]/30 bg-[var(--color-elevated)] text-[var(--color-warning)]",
        link: "border-transparent text-[var(--color-primary-text)] underline-offset-4 hover:underline",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      { className: cn(badgeVariants({ variant }), className) },
      props,
    ),
    render,
    state: { slot: "badge", variant },
  })
}

export { Badge, badgeVariants }
