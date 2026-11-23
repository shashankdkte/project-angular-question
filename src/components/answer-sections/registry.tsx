import * as React from "react";
import type { Answer } from "@/types/content";
import type { AnswerSectionKey } from "@/lib/curriculum";
import { AdditionalDetails, GenericSection } from "./generic-section";
import {
  CharacteristicsSection,
  DefinitionSection,
  IndustryExampleSection,
  MotivationSection,
  PitfallsSection,
  ProblemSolvedSection,
  SimpleAnalogySection,
  UseCasesSection,
  WhenNotToUseSection,
} from "./sections-core";
import {
  AlternativesSection,
  CodeExampleSection,
  EndToEndFlowSection,
  FollowUpsSection,
  ProjectExperienceSection,
  TestingSection,
} from "./sections-technical";

interface SectionDefinition {
  render: (answer: Answer) => React.ReactNode;
  /** Object keys this renderer understands; any others are shown as "Additional details". */
  knownKeys?: readonly string[];
}

/**
 * Section registry: answer-section key -> specialised renderer.
 *
 * To support a new section from a future schema, add one entry here (and its
 * title in curriculum.ts). Until then, unknown sections fall back to
 * <GenericSection />, so new content is visible rather than dropped.
 */
export const SECTION_REGISTRY: Record<AnswerSectionKey, SectionDefinition> = {
  definition: { render: (a) => <DefinitionSection data={a.definition} />, knownKeys: ["text"] },
  motivation: { render: (a) => <MotivationSection data={a.motivation} />, knownKeys: ["whyIntroduced", "historicalNote"] },
  problemSolved: { render: (a) => <ProblemSolvedSection data={a.problemSolved} />, knownKeys: ["before", "after", "benefits"] },
  characteristics: { render: (a) => <CharacteristicsSection data={a.characteristics} /> },
  simpleAnalogy: { render: (a) => <SimpleAnalogySection data={a.simpleAnalogy} />, knownKeys: ["title", "explanation"] },
  industryExample: {
    render: (a) => <IndustryExampleSection data={a.industryExample} />,
    knownKeys: ["industry", "scenario", "implementation", "businessImpact", "importantConstraint"],
  },
  useCases: { render: (a) => <UseCasesSection data={a.useCases} /> },
  endToEndFlow: { render: (a) => <EndToEndFlowSection data={a.endToEndFlow} />, knownKeys: ["steps", "diagrams"] },
  codeExample: {
    render: (a) => <CodeExampleSection data={a.codeExample} />,
    knownKeys: ["language", "filename", "runtime", "code", "explanation"],
  },
  projectExperience: {
    render: (a) => <ProjectExperienceSection data={a.projectExperience} />,
    knownKeys: ["status", "example", "evidenceToCollect", "doNotClaim"],
  },
  pitfalls: { render: (a) => <PitfallsSection data={a.pitfalls} /> },
  whenNotToUse: { render: (a) => <WhenNotToUseSection data={a.whenNotToUse} /> },
  alternatives: { render: (a) => <AlternativesSection data={a.alternatives} /> },
  testing: {
    render: (a) => <TestingSection data={a.testing} />,
    knownKeys: ["strategy", "testCases", "negativeCases", "verificationCommand"],
  },
  followUps: {
    render: (a) => <FollowUpsSection data={a.followUps} />,
    knownKeys: ["beginner", "intermediate", "advanced", "expert"],
  },
};

function isRegistered(key: string): key is AnswerSectionKey {
  return Object.prototype.hasOwnProperty.call(SECTION_REGISTRY, key);
}

/** Render one answer section by key, including any unknown extra fields it carries. */
export function renderAnswerSection(key: string, answer: Answer): React.ReactNode {
  const value = (answer as unknown as Record<string, unknown>)[key];

  if (!isRegistered(key)) {
    return value === undefined ? <p className="text-sm text-muted-foreground">This section has no content.</p> : <GenericSection data={value} />;
  }

  const definition = SECTION_REGISTRY[key];
  let extras: Record<string, unknown> | null = null;
  if (definition.knownKeys && typeof value === "object" && value !== null && !Array.isArray(value)) {
    const unknown = Object.entries(value as Record<string, unknown>).filter(([k]) => !definition.knownKeys!.includes(k));
    if (unknown.length > 0) extras = Object.fromEntries(unknown);
  }

  return (
    <>
      {definition.render(answer)}
      {extras && <AdditionalDetails data={extras} />}
    </>
  );
}
