const { cleanPolicyAction, extractRulesAction, generateScenariosAction, judgeScenariosAction, aggregateFindingsAction } = require('./.next/server/app/actions/ai-actions.js');

(async () => {
  try {
    const policy = `Global Remote Work & Hardware Policy... (California law paycheck deduction)`;
    
    console.log("Extracting rules...");
    const rulesStream = extractRulesAction(policy);
    let rules = [];
    for await (const chunk of rulesStream) {
      if (chunk.rules) rules = chunk.rules;
    }
    console.log("Rules extracted:", rules.length);
    
    console.log("Generating scenarios...");
    const scStream = generateScenariosAction(rules, policy);
    let scenarios = [];
    for await (const chunk of scStream) {
      if (chunk.scenarios) scenarios = chunk.scenarios;
    }
    console.log("Scenarios generated:", scenarios.length);
    
    console.log("Judging scenarios...");
    const jStream = judgeScenariosAction(scenarios, rules, policy, "None");
    let evals = [];
    for await (const chunk of jStream) {
      if (chunk.evaluations) evals = chunk.evaluations;
    }
    console.log("Evaluations:", evals.map(e => e.status));
    
    console.log("Aggregating findings...");
    const fStream = aggregateFindingsAction(evals, rules);
    let findings = [];
    for await (const chunk of fStream) {
      if (chunk.findings) findings = chunk.findings;
    }
    console.log("Findings:", findings.length);
    
  } catch (e) {
    console.error(e);
  }
})();
