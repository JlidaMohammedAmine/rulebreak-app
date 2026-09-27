import { Rule, Scenario, Evaluation, Finding, PatchProposal } from "@/types";

export interface AIProvider {
  cleanPolicy(policyText: string): Promise<string>;
  formatPolicy(policyText: string): Promise<string>;

  /**
   * Extracts structural rules from a given raw policy text.
   */
  extractRules(policyText: string): Promise<{ rules: Rule[], sources: any[] }>;

  /**
   * Generates scenarios based on the extracted rules and policy.
   * Target specifies how many to try to generate.
   */
  generateScenarios(rules: Rule[], policyText: string, targetCount?: number): Promise<Scenario[]>;

  /**
   * Judges a set of scenarios against the rules.
   */
  judgeScenarios(scenarios: Scenario[], rules: Rule[], policyText: string): Promise<Evaluation[]>;

  /**
   * Identifies higher-level findings (ambiguities, contradictions) from evaluations.
   */
  aggregateFindings(evaluations: Evaluation[], rules: Rule[], complianceFramework?: string): Promise<Finding[]>;

  /**
   * Generates adversarial test cases specifically challenging a set of rules.
   */
  challengePolicy(rulesToChallenge: Rule[], policyText: string): Promise<Scenario[]>;

  /**
   * Proposes a patch to resolve a specific finding.
   */
  proposePatch(finding: Finding, policyText: string, rules: Rule[]): Promise<PatchProposal>;
}
