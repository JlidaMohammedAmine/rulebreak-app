import { z } from "zod";
import * as schemas from "../lib/validation/schemas";

export type SourceChunk = z.infer<typeof schemas.sourceReferenceSchema>;
export type RuleCondition = z.infer<typeof schemas.ruleConditionSchema>;
export type Rule = z.infer<typeof schemas.ruleSchema>;
export type ScenarioCategory = z.infer<typeof schemas.scenarioCategorySchema>;
export type Scenario = z.infer<typeof schemas.scenarioSchema>;
export type EvaluationStatus = z.infer<typeof schemas.evaluationStatusSchema>;
export type Evidence = z.infer<typeof schemas.evidenceSchema>;
export type Evaluation = z.infer<typeof schemas.evaluationSchema>;
export type FindingSeverity = z.infer<typeof schemas.findingSeveritySchema>;
export type FindingType = z.infer<typeof schemas.findingTypeSchema>;
export type Finding = z.infer<typeof schemas.findingSchema>;
export type PatchProposal = z.infer<typeof schemas.patchProposalSchema>;

export type Policy = {
  id: string;
  title: string;
  rawText: string;
  sourceName?: string;
  sourceType: "text" | "markdown" | "pdf" | "demo";
  sourceChunks: SourceChunk[];
  createdAt: string;
};

export type AnalysisState = 
  | "IDLE"
  | "UPLOADED"
  | "CLEANING_POLICY"
  | "EXTRACTING_RULES"
  | "GENERATING_SCENARIOS"
  | "JUDGING"
  | "COMPLETE"
  | "CHALLENGING"
  | "PATCH_READY"
  | "PATCH_APPLIED"
  | "REGRESSION_RUNNING"
  | "REGRESSION_COMPLETE"
  | "ERROR";

export type RegressionRun = {
  id: string;
  timestamp: string;
  patchId: string;
  previousEvaluations: Evaluation[];
  newEvaluations: Evaluation[];
  regressions: string[]; // Scenario IDs that regressed
  resolvedFindings: string[]; // Finding IDs that were fixed
};

export type AnalysisSession = {
  id: string;
  state: AnalysisState;
  policy: Policy | null;
  rules: Rule[];
  scenarios: Scenario[];
  evaluations: Evaluation[];
  findings: Finding[];
  patches: PatchProposal[];
  regressionRuns: RegressionRun[];
  error?: string;
};
