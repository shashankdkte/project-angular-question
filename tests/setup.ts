import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";

// React Testing Library cleans up automatically only when globals are enabled;
// do it explicitly so DOM tests never leak between cases.
afterEach(async () => {
  if (typeof document !== "undefined") {
    const { cleanup } = await import("@testing-library/react");
    cleanup();
  }
});
