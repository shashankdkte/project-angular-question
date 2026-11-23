import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Providers } from "@/components/providers";
import { AppShell } from "@/components/layout/app-shell";
import { DIFFICULTIES, type Difficulty } from "@/lib/curriculum";
import { contentRepository } from "@/lib/content/repository";

export const metadata: Metadata = {
  title: { default: "Angular Mastery", template: "%s · Angular Mastery" },
  description:
    "A structured engineering knowledge platform: deeply explained Angular and full-stack questions across levels, roles and industries.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#171717" },
  ],
};

async function loadSidebarCounts() {
  const byDifficulty = Object.fromEntries(DIFFICULTIES.map((d) => [d, 0])) as Record<Difficulty, number>;
  try {
    const index = await contentRepository.getIndex();
    for (const question of index.questions) byDifficulty[question.difficulty] += 1;
    return { total: index.total, byDifficulty };
  } catch {
    // Content not built yet: the shell still renders; pages show a clear message.
    return { total: 0, byDifficulty };
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const counts = await loadSidebarCounts();

  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full">
        <Providers>
          <AppShell counts={counts}>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
