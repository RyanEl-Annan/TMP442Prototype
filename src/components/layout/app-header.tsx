"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useAppState } from "@/context/app-state";

const titles: Record<string, string> = {
  "/": "Dashboard",
  "/assistant": "Assistant",
  "/new-project": "New Project",
  "/team": "My Team",
  "/analysis": "AI Analysis",
  "/settings": "Settings",
};

export function AppHeader({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();
  const title = titles[pathname] ?? "TeamPilot AI";
  const { state } = useAppState();
  const projectName = state.project.name.trim();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur no-print">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenu}>
        <Menu className="size-4" />
        <span className="sr-only">Open navigation</span>
      </Button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {projectName || "TeamPilot AI"}
        </p>
        <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>
      </div>
      <ThemeToggle />
    </header>
  );
}
