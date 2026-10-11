// Prompt templates for each agent step. Used by the rule-based decider today
// (as documentation of intent) and ready to be sent to an LLM verbatim later.
//
// LLM hook contract per step:
//   input  = the step's typed input rendered as JSON
//   output = JSON matching the step's typed output (validated before use)

export const STEP_PROMPTS = {
  perceive: `You are the PERCEIVE step of a creative-director agent.
Given raw taste input (a persona id and/or free-form interest tags), output a
normalized taste profile as JSON:
{ "personaName": string, "interests": string[3-8, lowercase, deduped], "summary": string }
Rules: keep interests concrete (no "stuff"); summary is one short sentence.`,

  reason: `You are the REASON step of a creative-director agent.
Given a taste profile and a ranked list of brand affinities (0..1), choose:
1. ONE product to advertise (from the provided catalog).
2. ONE creative angle connecting the product to the top-affinity taste world.
Output JSON:
{ "product": string, "angle": string, "rationale": string,
  "accentColor": string (hex, fits the angle's mood) }
Rules: the angle must reference at least one specific interest from the profile;
never pick the generic "high quality / best choice" angle; if a constraint note
is provided, obey it and pick a DIFFERENT angle than before.`,

  generate: `You are the GENERATE step of a creative-director agent.
Given the chosen product + angle + taste profile, write:
1. visualPrompt: a detailed image-generation prompt (subject, setting, lighting,
   mood, composition, color palette). No text-in-image except tiny signage.
2. copyHeadline: <= 8 words, speaks the taste world's language.
3. copySubline: <= 16 words, product benefit tied to the angle.
Output JSON: { "visualPrompt": string, "copyHeadline": string, "copySubline": string }`,

  selfCheck: `You are the SELF-CHECK step of a creative-director agent.
Given the taste profile, chosen angle, and generated briefs, verify:
1. The visualPrompt names the product explicitly.
2. The angle references >=1 specific profile interest (not generic praise).
3. Headline <= 8 words, subline <= 16 words.
4. No disallowed content (no people stereotypes, no medical/financial claims).
Output JSON: { "passed": boolean, "issues": string[] }
If passed=false, the pipeline retries REASON with issues as the constraint note.`,
};
