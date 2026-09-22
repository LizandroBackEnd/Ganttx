import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-[#00f28e] via-[#00e588] to-[#00d47e] text-[#04120a] font-bold shadow-md shadow-emerald-500/20 hover:from-[#00ff9d] hover:to-[#00f28e] hover:shadow-emerald-500/35 hover:brightness-105 active:scale-[0.98]",
        outline:
          "border-border bg-surface-elevated/40 text-text-primary hover:bg-surface-elevated hover:border-primary/40 hover:text-text-primary aria-expanded:bg-muted aria-expanded:text-foreground",
        secondary:
          "bg-surface-elevated text-text-primary hover:bg-surface-elevated/80 aria-expanded:bg-surface-elevated",
        ghost:
          "hover:bg-surface-elevated hover:text-text-primary aria-expanded:bg-surface-elevated",
        destructive:
          "bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25 focus-visible:ring-destructive/30",
        link: "text-primary underline-offset-4 hover:underline",
        gradientBlue:
          "bg-gradient-to-r from-sky-400 via-sky-500 to-blue-600 text-white font-bold shadow-md shadow-blue-500/20 hover:brightness-105 active:scale-[0.98]",
        gradientOrange:
          "bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-white font-bold shadow-md shadow-orange-500/20 hover:brightness-105 active:scale-[0.98]",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
