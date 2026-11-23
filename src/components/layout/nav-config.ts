import {
  BarChart3,
  Bookmark,
  Building2,
  FolderKanban,
  LayoutDashboard,
  ListTree,
  type LucideIcon,
} from "lucide-react";
import { DIFFICULTIES, DIFFICULTY_META, type Difficulty } from "@/lib/curriculum";

export interface NavItem {
  href: string;
  label: string;
  icon?: LucideIcon;
  /** Difficulty whose loaded-question count is shown as a badge. */
  countFor?: Difficulty;
  /** Exact match only (used for "/"). */
  exact?: boolean;
}

export const PRIMARY_NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/questions", label: "All Questions", icon: ListTree },
];

export const LEVEL_NAV: NavItem[] = DIFFICULTIES.map((difficulty) => ({
  href: `/levels/${difficulty}`,
  label: DIFFICULTY_META[difficulty].label,
  countFor: difficulty,
}));

export const SECONDARY_NAV: NavItem[] = [
  { href: "/industries", label: "Industries", icon: Building2 },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/bookmarks", label: "Bookmarks", icon: Bookmark },
  { href: "/progress", label: "Learning Progress", icon: BarChart3 },
];

export function isNavActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
