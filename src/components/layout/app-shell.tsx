"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/lib/ui-store";
import { AppSidebar, type SidebarCounts } from "./app-sidebar";
import { CommandPalette } from "./command-palette";
import { useCommandPalette } from "./command-store";
import { ThemeToggle } from "./theme-toggle";

function TopBar() {
  const openPalette = useCommandPalette((state) => state.setOpen);

  return (
    <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <SidebarTrigger aria-label="Toggle navigation" className="-ml-1" />
      <Separator orientation="vertical" className="mx-1 h-4" />
      <Button
        variant="outline"
        size="sm"
        className="h-8 w-full max-w-xs justify-start gap-2 font-normal text-muted-foreground"
        onClick={() => openPalette(true)}
        aria-label="Search questions"
      >
        <Search aria-hidden className="size-3.5" />
        <span className="truncate">Search questions…</span>
        <kbd className="ml-auto hidden rounded border bg-muted px-1.5 font-mono text-[10px] sm:inline">Ctrl K</kbd>
      </Button>
      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
      </div>
    </header>
  );
}

export function AppShell({ counts, children }: { counts: SidebarCounts; children: React.ReactNode }) {
  const sidebarOpen = useUiStore((state) => state.sidebarOpen);
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen);

  return (
    <SidebarProvider
      open={sidebarOpen}
      onOpenChange={setSidebarOpen}
      style={{ "--sidebar-width": "260px" } as React.CSSProperties}
    >
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-background px-3 py-2 text-sm font-medium shadow focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to main content
      </a>
      <AppSidebar counts={counts} />
      <SidebarInset className="min-w-0">
        <TopBar />
        <div id="main-content" tabIndex={-1} className="min-w-0 flex-1 outline-none">
          {children}
        </div>
      </SidebarInset>
      <CommandPalette />
    </SidebarProvider>
  );
}
