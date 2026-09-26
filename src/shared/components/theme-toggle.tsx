"use client";

import { useTheme } from "./theme-provider";
import { IconSun, IconMoon } from "@tabler/icons-react";
import { Button } from "@/shared/components/ui/button";

export function ThemeToggle(): React.JSX.Element {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="size-8 p-0 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors"
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
    >
      {isDark ? (
        <IconSun className="size-4.5 text-warning transition-transform hover:rotate-45 duration-300" />
      ) : (
        <IconMoon className="size-4.5 text-text-primary transition-transform hover:-rotate-12 duration-300" />
      )}
    </Button>
  );
}
