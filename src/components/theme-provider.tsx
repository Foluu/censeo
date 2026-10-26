"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

// next-themes injects an inline <script> that applies the theme before first
// paint. It only needs to run from the server-rendered HTML; on the client,
// React 19 warns about rendering an executable <script>, so mark it inert there.
const scriptProps =
  typeof window === "undefined" ? undefined : ({ type: "application/json" } as const);

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider scriptProps={scriptProps} {...props}>
      {children}
    </NextThemesProvider>
  );
}
