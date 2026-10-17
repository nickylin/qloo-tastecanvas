"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
