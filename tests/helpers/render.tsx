import * as React from "react";
import { render as rtlRender, type RenderOptions } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";

/** Render with the same context providers the app root supplies. */
function Providers({ children }: { children: React.ReactNode }) {
  return <TooltipProvider>{children}</TooltipProvider>;
}

export function render(ui: React.ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  return rtlRender(ui, { wrapper: Providers, ...options });
}
