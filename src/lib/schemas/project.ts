import { z } from "zod";
import { INDUSTRIES } from "../curriculum";
import { DiagramSchema } from "./answer";

/**
 * Project metadata schema (version 1).
 *
 * Version 1 intentionally describes *plans*, not implementations: nothing here
 * implies a project has been built. `status` defaults to "planned" and the UI
 * never invents repositories, milestones or evidence.
 *
 * File shape: `data/projects/**\/*.json`
 *   { "schemaVersion": "1.0.0", "projects": [ <Project>, ... ] }
 */

export const PROJECT_STATUSES = ["planned", "in-progress", "completed"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

const ProjectModuleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

const ProjectMilestoneSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["planned", "in-progress", "done"]).default("planned"),
});

export const ProjectSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, "must be lowercase letters, digits and dashes"),
  industry: z.enum(INDUSTRIES),
  title: z.string().min(1),
  description: z.string().min(1),
  status: z.enum(PROJECT_STATUSES).default("planned"),
  techStack: z.array(z.string()).default([]),
  businessObjectives: z.array(z.string()).default([]),
  modules: z.array(ProjectModuleSchema).default([]),
  milestones: z.array(ProjectMilestoneSchema).default([]),
  relatedQuestionIds: z.array(z.string()).default([]),
  repositoryUrl: z.url().optional(),
  architectureDiagrams: z.array(DiagramSchema).optional(),
});

export const ProjectFileSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  projects: z.array(ProjectSchema).min(1),
});

export type Project = z.output<typeof ProjectSchema>;
