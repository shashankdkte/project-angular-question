import "server-only";
import { ContentNotBuiltError, contentRepository } from "./repository";
import type { ContentIndex } from "../../types/content";

/** The content index, or null when `content:build` has not been run yet (pages show a helpful state). */
export async function loadIndex(): Promise<ContentIndex | null> {
  try {
    return await contentRepository.getIndex();
  } catch (error) {
    if (error instanceof ContentNotBuiltError) return null;
    throw error;
  }
}
