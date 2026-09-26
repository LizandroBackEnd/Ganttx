"use client";

import * as React from "react";

export type Theme = "light" | "dark" | "system";

export interface ThemeContextValue {
  readonly theme: Theme;
  readonly resolvedTheme: "light" | "dark";
  readonly setTheme: (theme: Theme) => void;
  readonly toggleTheme: () => void;
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = "ganttx-theme";

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    const val = localStorage.getItem(THEME_STORAGE_KEY);
    if (val === "light" || val === "dark" || val === "system") {
      return val;
    }
    return "dark";
  } catch {
    return "dark";
  }
}

function subscribeToTheme(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  mediaQuery.addEventListener("change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    mediaQuery.removeEventListener("change", callback);
  };
}

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") {
    return getSystemTheme();
  }
  return theme;
}

export interface ThemeProviderProps {
  readonly children: React.ReactNode;
  readonly defaultTheme?: Theme;
}

export function ThemeProvider({
  children,
}: ThemeProviderProps): React.JSX.Element {
  const currentTheme = React.useSyncExternalStore<Theme>(
    subscribeToTheme,
    getStoredTheme,
    (): Theme => "dark"
  );

  const resolvedTheme = resolveTheme(currentTheme);

  React.useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [resolvedTheme]);

  const setTheme = React.useCallback((newTheme: Theme): void => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
      window.dispatchEvent(new Event("storage"));
    } catch {}
  }, []);

  const toggleTheme = React.useCallback((): void => {
    const nextTheme: Theme = resolvedTheme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
  }, [resolvedTheme, setTheme]);

  const contextValue = React.useMemo<ThemeContextValue>(
    () => ({
      theme: currentTheme,
      resolvedTheme,
      setTheme,
      toggleTheme,
    }),
    [currentTheme, resolvedTheme, setTheme, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

export function ThemeScript(): React.JSX.Element {
  const scriptContent = `(function(){try{var k='${THEME_STORAGE_KEY}';var s=localStorage.getItem(k);var p=window.matchMedia('(prefers-color-scheme: dark)').matches;var t=s||(p?'dark':'light');if(t==='dark'||(t==='system'&&p)){document.documentElement.classList.add('dark');}else{document.documentElement.classList.remove('dark');}}catch(e){}})();`;

  return (
    <script
      dangerouslySetInnerHTML={{ __html: scriptContent }}
      suppressHydrationWarning
    />
  );
}
