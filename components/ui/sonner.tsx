"use client"

import { DotIcon } from "@/components/retro/dot-icon";

import { useAppearance } from "@/hooks/use-appearance"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { effectiveColorMode } = useAppearance()

  return (
    <Sonner
      theme={effectiveColorMode}
      className="toaster group"
      icons={{
        success: (
          <DotIcon name="circleCheck" className="size-4" />
        ),
        info: (
          <DotIcon name="chat" className="size-4" />
        ),
        warning: (
          <DotIcon name="circleBlock" className="size-4" />
        ),
        error: (
          <DotIcon name="circleClose" className="size-4" />
        ),
        loading: (
          <DotIcon name="circleDots" className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--color-surface)",
          "--normal-text": "var(--color-text-main)",
          "--normal-border": "var(--color-border)",
          "--border-radius": "var(--radius-card)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
