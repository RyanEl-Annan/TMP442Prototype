"use client";

import { ThemeProvider } from "next-themes";
import { MotionConfig } from "motion/react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppStateProvider } from "@/context/app-state";
import { AppShell } from "@/components/layout/app-shell";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <MotionConfig reducedMotion="user">
      <TooltipProvider>
        <AppStateProvider>
          <AppShell>{children}</AppShell>
          <Toaster />
        </AppStateProvider>
      </TooltipProvider>
      </MotionConfig>
    </ThemeProvider>
  );
}
