// "Creative Director" agent — multi-step pipeline, NOT a single prompt.
//
//   perceive  -> normalize raw taste input into a structured taste profile
//   reason    -> pick product + creative angle from Qloo affinities
//   generate  -> build image brief + copy brief
//   selfCheck -> validate the briefs; on failure, loop back to reason()
//               with a constraint note (max 2 retries)
//
// The decision logic is rule-based today so the pipeline runs with zero keys.
// Each step has a documented LLM hook (see prompts.ts): when an LLM key is
// available, swap the step's decide() implementation for an LLM call using
// the step's prompt template. Step I/O shapes stay identical.

import { BrandAffinity, InsightsResult, TasteSignal } from "../qloo/types";

export interface TasteProfile {
  personaId?: string;
  personaName: string;
  interests: string[];
  /** normalized summary sentence, e.g. "jazz, vinyl and espresso" */
  summary: string;
}

export interface CreativeAngle {
  product: string;
  productBlurb: string;
  angle: string;
  rationale: string;
  topBrand: BrandAffinity;
  visualPrompt: string;
  copyHeadline: string;
  copySubline: string;
  accentColor: string;
}

export interface AgentTrace {
  steps: { name: string; detail: string; attempt: number }[];
  retries: number;
  passed: boolean;
}

export interface DirectorOutput {
  profile: TasteProfile;
  insights: InsightsResult;
  angle: CreativeAngle;
  trace: AgentTrace;
}
