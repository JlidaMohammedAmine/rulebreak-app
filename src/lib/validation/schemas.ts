import { z } from "zod";

// Source Reference
export const sourceReferenceSchema = z.object({
  id: z.string(), // e.g., SRC-001
  page: z.number().nullable().describe("Can be null"),
  paragraph: z.number().nullable().describe("Can be null"),
  text: z.string(),
});

// Rule
export const ruleConditionSchema = z.object({
  field: z.string(),
  operator: z.string(),
  value: z.string().nullable().describe("Can be null"),
});

export const ruleSchema = z.object({
  id: z.string(), // e.g., R01
  statement: z.string(),
  category: z.enum([
    "time_limit",
    "exception",
    "condition",
    "restriction",
    "action",
    "definition",
    "other",
  ]),
  conditions: z.array(ruleConditionSchema).nullable().describe("Can be null"),
  exceptions: z.array(z.string()).nullable().describe("Can be null"),
  action: z.string().nullable().describe("Can be null"),
  precedence: z.string().nullable().describe("Can be null"),
  sourceId: z.string(),
  confidence: z.enum(["high", "medium", "low"]).nullable().describe("Can be null"),
});

export const rulesResponseSchema = z.object({
  rules: z.array(ruleSchema),
  sources: z.array(sourceReferenceSchema),
});

// Scenario
export const scenarioCategorySchema = z.enum([
  "NORMAL",
  "BOUNDARY",
  "AMBIGUOUS",
  "CONTRADICTION",
  "EXCEPTION_INTERACTION",
  "MISSING_INFORMATION",
  "SEQUENCE",
  "PRECEDENCE",
  "ADVERSARIAL",
]);

export const scenarioSchema = z.object({
  id: z.string(), // e.g., S001
  type: scenarioCategorySchema,
  title: z.string(),
  facts: z.record(z.string(), z.string()),
  narrative: z.string(),
  targetRules: z.array(z.string()),
  expectedRisk: z.enum(["high", "medium", "low"]).nullable().describe("Can be null"),
});

export const scenariosResponseSchema = z.object({
  scenarios: z.array(scenarioSchema),
});

// Evaluation
export const evaluationStatusSchema = z.enum([
  "PASS",
  "FAIL",
  "AMBIGUOUS",
  "CONTRADICTION",
  "MISSING_RULE",
  "INSUFFICIENT_INFORMATION",
]);

export const evidenceSchema = z.object({
  ruleId: z.string().nullable().describe("Can be null"),
  sourceText: z.string(),
});

export const evaluationSchema = z.object({
  scenarioId: z.string(),
  status: evaluationStatusSchema,
  summary: z.string(),
  applicableRules: z.array(z.string()),
  evidence: z.array(evidenceSchema),
  reasoning: z.string(),
  recommendedClarification: z.string().nullable().describe("Can be null"),
});

export const evaluationsResponseSchema = z.object({
  evaluations: z.array(evaluationSchema),
});

// Finding
export const findingSeveritySchema = z.enum(["HIGH", "MEDIUM", "LOW"]);
export const findingTypeSchema = z.enum([
  "CONTRADICTION",
  "AMBIGUITY",
  "MISSING_RULE",
  "PRECEDENCE_CONFLICT",
  "BOUNDARY_GAP",
  "INSUFFICIENT_INFORMATION",
  "COMPLIANCE_VIOLATION",
]);

export const findingSchema = z.object({
  id: z.string(), // e.g., F001
  type: findingTypeSchema,
  severity: findingSeveritySchema,
  ruleIds: z.array(z.string()),
  description: z.string(),
  evidence: z.string(), // High level explanation of the conflict/ambiguity
  scenarioIds: z.array(z.string()),
});

export const findingsResponseSchema = z.object({
  findings: z.array(findingSchema),
});

// Patch Proposal
export const patchProposalSchema = z.object({
  id: z.string(),
  findingId: z.string(),
  originalText: z.string(),
  proposedText: z.string(),
  explanation: z.string(),
});

export const patchResponseSchema = z.object({
  patch: patchProposalSchema,
});
