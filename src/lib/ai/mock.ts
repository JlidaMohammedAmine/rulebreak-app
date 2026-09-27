import { AIProvider } from "./provider";
import { Rule, Scenario, Evaluation, Finding, PatchProposal } from "@/types";

export class MockProvider implements AIProvider {
  // Delay helper to simulate network request
  private async delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async cleanPolicy(policyText: string): Promise<string> {
    await this.delay(1000);
    
    // Heuristic cleaning for the mock provider to handle raw website scrapes (like Walmart)
    const lines = policyText.split('\n');
    const noisePatterns = [
      /skip to main/i, /skip to footer/i, /^about$/i, /^purpose$/i, /^news$/i, 
      /^investors$/i, /^suppliers$/i, /^careers$/i, /^ask walmart$/i, /^shop$/i, 
      /^search$/i, /^menu$/i, /\[.*?\]\(.*?\)/
    ];
    
    const cleanLines = lines.filter(line => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      
      // If the line is just a link or a navigation keyword, skip it
      for (const pattern of noisePatterns) {
        if (pattern.test(trimmed)) {
          // If the line is EXACTLY a noise word, or mostly a link
          if (trimmed.length < 30 || pattern.test(trimmed)) {
             return false;
          }
        }
      }
      return true;
    });

    return cleanLines.join('\n');
  }

  async formatPolicy(policyText: string): Promise<string> {
    await this.delay(1500);
    
    // Add markdown formatting heuristics
    let formatted = policyText
      .replace(/([A-Z][a-z]+ [A-Z][a-z]+ Policy)/g, '## $1\n')
      .replace(/([A-Z\s]{10,})/g, '### $1\n') // uppercase headers
      .replace(/•/g, '\n-'); // bullets
      
    return `# Cleaned & Structured Policy\n\n${formatted}`;
  }

  async extractRules(policyText: string) {
    await this.delay(1500);
    const sources = [
      { id: "SRC-01", text: "Customers may request a refund within 14 calendar days of purchase.", paragraph: 1 },
      { id: "SRC-02", text: "The product must be unused and returned in its original packaging.", paragraph: 2 },
      { id: "SRC-03", text: "Proof of purchase is required.", paragraph: 3 },
      { id: "SRC-04", text: "Clearance products are final sale.", paragraph: 4 },
      { id: "SRC-05", text: "Defective products may be returned within 30 days.", paragraph: 5 },
      { id: "SRC-06", text: "Shipping fees are non-refundable.", paragraph: 6 },
      { id: "SRC-07", text: "Refunds are issued to the original payment method.", paragraph: 7 },
    ];

    const rules: Rule[] = [
      {
        id: "R01",
        statement: "Refunds are allowed within 14 days of purchase.",
        category: "time_limit",
        conditions: [{ field: "days_since_purchase", operator: "<=", value: 14 }],
        sourceId: "SRC-01",
        confidence: "high"
      },
      {
        id: "R02",
        statement: "Product must be unused and in original packaging.",
        category: "condition",
        conditions: [
          { field: "is_used", operator: "==", value: false },
          { field: "has_original_packaging", operator: "==", value: true }
        ],
        sourceId: "SRC-02",
        confidence: "high"
      },
      {
        id: "R03",
        statement: "Proof of purchase is required.",
        category: "condition",
        conditions: [{ field: "has_proof_of_purchase", operator: "==", value: true }],
        sourceId: "SRC-03",
        confidence: "high"
      },
      {
        id: "R04",
        statement: "Clearance products cannot be returned.",
        category: "exception",
        conditions: [{ field: "product_type", operator: "==", value: "clearance" }],
        action: "refund_denied",
        sourceId: "SRC-04",
        confidence: "high"
      },
      {
        id: "R05",
        statement: "Defective products can be returned within 30 days.",
        category: "exception",
        conditions: [
          { field: "is_defective", operator: "==", value: true },
          { field: "days_since_purchase", operator: "<=", value: 30 }
        ],
        sourceId: "SRC-05",
        confidence: "high"
      },
      {
        id: "R06",
        statement: "Shipping fees are not refunded.",
        category: "restriction",
        sourceId: "SRC-06",
        confidence: "high"
      }
    ];

    return { rules, sources };
  }

  async generateScenarios(rules: Rule[], policyText: string, targetCount: number = 8) {
    await this.delay(2000);
    return [
      {
        id: "S01",
        type: "NORMAL",
        title: "Standard Valid Return",
        facts: { days_since_purchase: 5, is_used: false, has_original_packaging: true, has_proof_of_purchase: true, product_type: "standard", is_defective: false },
        narrative: "Customer returns an unopened non-clearance product 5 days after purchase with a valid receipt.",
        targetRules: ["R01", "R02", "R03"]
      },
      {
        id: "S02",
        type: "BOUNDARY",
        title: "Exact 14-Day Boundary",
        facts: { days_since_purchase: 14, is_used: false, has_original_packaging: true, has_proof_of_purchase: true, product_type: "standard", is_defective: false },
        narrative: "Customer returns a product exactly 14 calendar days after purchase.",
        targetRules: ["R01"]
      },
      {
        id: "S03",
        type: "BOUNDARY",
        title: "Late Return (15 Days)",
        facts: { days_since_purchase: 15, is_used: false, has_original_packaging: true, has_proof_of_purchase: true, product_type: "standard", is_defective: false },
        narrative: "Customer returns a product 15 days after purchase.",
        targetRules: ["R01"]
      },
      {
        id: "S04",
        type: "AMBIGUOUS",
        title: "Opened but Unused",
        facts: { days_since_purchase: 5, is_used: false, has_original_packaging: false, has_proof_of_purchase: true, product_type: "standard", is_defective: false },
        narrative: "Customer opened the packaging but never used the product. They lost the box.",
        targetRules: ["R02"]
      },
      {
        id: "S05",
        type: "MISSING_INFORMATION",
        title: "No Receipt Stated",
        facts: { days_since_purchase: 5, is_used: false, has_original_packaging: true, product_type: "standard", is_defective: false },
        narrative: "Customer requests a refund but does not mention if they have a receipt.",
        targetRules: ["R03"]
      },
      {
        id: "S06",
        type: "EXCEPTION_INTERACTION",
        title: "Defective Clearance Item (20 Days)",
        facts: { days_since_purchase: 20, is_used: false, has_original_packaging: true, has_proof_of_purchase: true, product_type: "clearance", is_defective: true },
        narrative: "Customer purchased a clearance product and reports that it arrived defective 20 days ago.",
        targetRules: ["R04", "R05"]
      },
      {
        id: "S07",
        type: "PRECEDENCE",
        title: "Defective Clearance Item (5 Days)",
        facts: { days_since_purchase: 5, is_used: false, has_original_packaging: true, has_proof_of_purchase: true, product_type: "clearance", is_defective: true },
        narrative: "Customer returns a defective clearance product 5 days after purchase.",
        targetRules: ["R04", "R05"]
      },
      {
        id: "S08",
        type: "AMBIGUOUS",
        title: "Delivery Date vs Purchase Date",
        facts: { days_since_purchase: 14, days_since_delivery: 5, is_used: false, has_original_packaging: true, has_proof_of_purchase: true, product_type: "standard", is_defective: false },
        narrative: "Customer purchased the product 14 days ago, but it was delivered 5 days ago.",
        targetRules: ["R01"]
      }
    ] as Scenario[];
  }

  async judgeScenarios(scenarios: Scenario[], rules: Rule[], policyText: string) {
    await this.delay(1500);
    
    // Deterministic mock logic based on scenario IDs
    return scenarios.map(s => {
      const evaluation: any = {
        scenarioId: s.id,
        applicableRules: s.targetRules,
        evidence: s.targetRules.map(rId => ({ ruleId: rId, sourceText: rules.find(r => r.id === rId)?.statement || "" }))
      };

      switch(s.id) {
        case "S01":
        case "S02":
          evaluation.status = "PASS";
          evaluation.summary = "Scenario meets all return conditions.";
          evaluation.reasoning = "Product is within 14 days, unused, has receipt and original packaging.";
          break;
        case "S03":
          evaluation.status = "FAIL";
          evaluation.summary = "Return period exceeded.";
          evaluation.reasoning = "15 days is greater than the 14 day limit.";
          break;
        case "S04":
          evaluation.status = "FAIL";
          evaluation.summary = "Missing original packaging.";
          evaluation.reasoning = "The policy strictly requires original packaging.";
          break;
        case "S05":
          evaluation.status = "INSUFFICIENT_INFORMATION";
          evaluation.summary = "Missing receipt information.";
          evaluation.reasoning = "Cannot determine outcome without knowing if proof of purchase exists.";
          break;
        case "S06":
        case "S07":
          evaluation.status = "CONTRADICTION";
          evaluation.summary = "Conflicting rules for defective clearance products.";
          evaluation.reasoning = "R04 states clearance items cannot be returned, but R05 states defective items can be returned up to 30 days. Precedence is undefined.";
          evaluation.recommendedClarification = "Explicitly state whether defective exception overrides the clearance final-sale rule.";
          break;
        case "S08":
          evaluation.status = "AMBIGUOUS";
          evaluation.summary = "Ambiguity around 'purchase' date.";
          evaluation.reasoning = "Policy says '14 days of purchase', not delivery. This might unfairly penalize customers with slow shipping.";
          evaluation.recommendedClarification = "Clarify if the 14 days begins on the order date or the delivery date.";
          break;
        // Default for challenged scenarios
        default:
          evaluation.status = s.id.includes("C") ? "FAIL" : "PASS";
          evaluation.summary = "Judged fallback.";
          evaluation.reasoning = "Judged fallback.";
      }
      return evaluation as Evaluation;
    });
  }

  async aggregateFindings(evaluations: Evaluation[], rules: Rule[], complianceFramework?: string) {
    await this.delay(1000);
    const mockFindings = [
      {
        id: "F01",
        type: "CONTRADICTION",
        severity: "HIGH",
        ruleIds: ["R04", "R05"],
        description: "Precedence conflict between Clearance and Defective items",
        evidence: "The policy does not define which rule takes precedence when a clearance product is defective.",
        scenarioIds: ["S06", "S07"]
      },
      {
        id: "F02",
        type: "AMBIGUITY",
        severity: "MEDIUM",
        ruleIds: ["R01"],
        description: "Undefined start date for return window",
        evidence: "Policy states '14 days of purchase' which creates ambiguity when shipping time is significant.",
        scenarioIds: ["S08"]
      }
    ] as Finding[];

    if (complianceFramework && complianceFramework !== "None") {
      mockFindings.push({
        id: "F03",
        type: "COMPLIANCE_VIOLATION",
        severity: "HIGH",
        ruleIds: ["R01"],
        description: `Potential violation of ${complianceFramework}`,
        evidence: `Under ${complianceFramework}, the return window might be required to start upon delivery rather than purchase.`,
        scenarioIds: []
      } as Finding);
    }

    return mockFindings;
  }


  async challengePolicy(rulesToChallenge: Rule[], policyText: string) {
    await this.delay(2000);
    return [
      {
        id: "C01",
        type: "ADVERSARIAL",
        title: "Defective Clearance on Day 31",
        facts: { days_since_purchase: 31, product_type: "clearance", is_defective: true },
        narrative: "A defective clearance product is returned on day 31.",
        targetRules: ["R04", "R05"]
      },
      {
        id: "C02",
        type: "ADVERSARIAL",
        title: "Damaged in Transit Clearance Item",
        facts: { days_since_purchase: 2, product_type: "clearance", is_defective: false, damaged_in_transit: true },
        narrative: "A clearance item is damaged during delivery. Is that considered defective?",
        targetRules: ["R04", "R05"]
      },
      {
        id: "C03",
        type: "ADVERSARIAL",
        title: "Used Defective Clearance Item",
        facts: { days_since_purchase: 15, is_used: true, product_type: "clearance", is_defective: true },
        narrative: "Customer used the clearance item for 15 days, it broke due to a defect, and they want to return it.",
        targetRules: ["R02", "R04", "R05"]
      }
    ] as Scenario[];
  }

  async proposePatch(finding: Finding, policyText: string, rules: Rule[]) {
    await this.delay(1500);
    if (finding.id === "F01") {
      return {
        id: "P01",
        findingId: "F01",
        originalText: "Clearance products are final sale.\nDefective products may be returned within 30 days.",
        proposedText: "Clearance products are final sale, unless the product is defective. Defective products (including clearance items) may be returned within 30 days.",
        explanation: "This explicitly gives precedence to the defective exception, resolving the contradiction."
      };
    }
    
    return {
      id: "P02",
      findingId: finding.id,
      originalText: policyText.substring(0, 50),
      proposedText: policyText.substring(0, 50) + " (patched)",
      explanation: "Generic patch applied."
    };
  }
}
