"use client";

import { Toaster as SileoToaster } from "sileo";
import { useTheme } from "./theme-provider";

export function Toaster(): React.JSX.Element {
  const { resolvedTheme } = useTheme();

  return (
    <SileoToaster
      position="top-center"
      theme={resolvedTheme}
      options={{
        position: "top-center",
      }}
    />
  );
}
