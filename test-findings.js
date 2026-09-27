const { aggregateFindingsAction } = require('./.next/server/app/actions/ai-actions.js');
(async () => {
  try {
    const rules = [{ id: 'R1', statement: 'Pip must be 5 days in office' }, { id: 'R2', statement: 'Remote workers can expense $500' }];
    const evals = [{ scenarioId: 'S1', status: 'FAIL', summary: 'Fails PIP check', applicableRules: ['R1'], evidence: [], reasoning: 'bad' }];
    const stream = aggregateFindingsAction(evals, rules);
    let final = null;
    for await (const chunk of stream) {
      console.log(chunk);
      final = chunk;
    }
  } catch (e) { console.error(e); }
})();
