"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Progress } from "@/components/ui/progress";
import { CURRICULUM_TARGET, type Difficulty } from "@/lib/curriculum";
import { useCommandPalette } from "./command-store";
import { LEVEL_NAV, PRIMARY_NAV, SECONDARY_NAV, isNavActive, type NavItem } from "./nav-config";

export interface SidebarCounts {
  total: number;
  byDifficulty: Record<Difficulty, number>;
}

function NavLink({ item, pathname, counts }: { item: NavItem; pathname: string; counts: SidebarCounts }) {
  const { isMobile, setOpenMobile } = useSidebar();
  const active = isNavActive(pathname, item);
  const Icon = item.icon;
  const count = item.countFor ? counts.byDifficulty[item.countFor] : undefined;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
        <Link
          href={item.href}
          aria-current={active ? "page" : undefined}
          onClick={() => isMobile && setOpenMobile(false)}
        >
          {Icon ? <Icon aria-hidden /> : <span aria-hidden className="size-4" />}
          <span>{item.label}</span>
        </Link>
      </SidebarMenuButton>
      {count !== undefined && (
        <SidebarMenuBadge aria-label={`${count} questions loaded`}>{count}</SidebarMenuBadge>
      )}
    </SidebarMenuItem>
  );
}

export function AppSidebar({ counts }: { counts: SidebarCounts }) {
  const pathname = usePathname();
  const openPalette = useCommandPalette((state) => state.setOpen);
  const { isMobile, setOpenMobile } = useSidebar();
  const coverage = Math.min(100, Math.round((counts.total / CURRICULUM_TARGET) * 100));

  return (
    <Sidebar collapsible="icon" aria-label="Primary">
      <SidebarHeader className="h-12 justify-center border-b px-3">
        <Link href="/" className="flex items-center gap-2 rounded-md outline-offset-2" aria-label="Angular Mastery home">
          <span
            aria-hidden
            className="flex size-6 shrink-0 items-center justify-center rounded-md bg-foreground text-[11px] font-semibold text-background"
          >
            A
          </span>
          <span className="truncate text-sm font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
            Angular Mastery
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {PRIMARY_NAV.map((item) => (
                <NavLink key={item.href} item={item} pathname={pathname} counts={counts} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Levels</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {LEVEL_NAV.map((item) => (
                <NavLink key={item.href} item={item} pathname={pathname} counts={counts} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {SECONDARY_NAV.map((item) => (
                <NavLink key={item.href} item={item} pathname={pathname} counts={counts} />
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Search"
                  onClick={() => {
                    if (isMobile) setOpenMobile(false);
                    openPalette(true);
                  }}
                >
                  <Search aria-hidden />
                  <span>Search</span>
                  <kbd className="ml-auto hidden rounded border bg-background px-1.5 font-mono text-[10px] text-muted-foreground group-data-[collapsible=icon]:hidden md:inline">
                    Ctrl K
                  </kbd>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-2 border-t p-3 group-data-[collapsible=icon]:hidden">
        <div className="flex items-baseline justify-between text-xs">
          <span className="text-muted-foreground">Content available</span>
          <span className="font-medium tabular-nums">
            {counts.total} <span className="text-muted-foreground">/ {CURRICULUM_TARGET}</span>
          </span>
        </div>
        <Progress
          value={coverage}
          className="h-1"
          aria-label={`${counts.total} of ${CURRICULUM_TARGET} curriculum questions are loaded`}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
