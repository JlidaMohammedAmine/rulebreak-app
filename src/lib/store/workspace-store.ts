import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AnalysisSession, Policy, Rule, Scenario, Evaluation, Finding, AnalysisState, PatchProposal, RegressionRun } from '@/types';


interface WorkspaceState {
  session: AnalysisSession;
  
  // Actions
  setPolicy: (policy: Policy) => void;
  setState: (state: AnalysisState) => void;
  setRules: (rules: Rule[]) => void;
  setScenarios: (scenarios: Scenario[]) => void;
  setEvaluations: (evaluations: Evaluation[]) => void;
  setFindings: (findings: Finding[]) => void;
  setPatches: (patches: PatchProposal[]) => void;
  setError: (error: string | undefined) => void;
  reset: () => void;
  
  // Orchestration Thunks
  startAnalysis: (inputs: {title: string, text: string}[], complianceFramework?: string) => Promise<void>;
  loadDemo: () => void;
  challengeRules: (rulesToChallenge: Rule[]) => Promise<void>;
  proposePatch: (finding: Finding) => Promise<void>;
  applyPatchAndRegress: (patch: PatchProposal) => Promise<void>;
  autoFixAllFindings: () => Promise<void>;

  // UI State
  activeHighlightId: string | null;
  setActiveHighlight: (id: string | null) => void;
}

const initialSession: AnalysisSession = {
  id: "session-1",
  state: "IDLE",
  policy: null,
  rules: [],
  scenarios: [],
  evaluations: [],
  findings: [],
  patches: [],
  regressionRuns: []
};

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      session: initialSession,
      
      setPolicy: (policy) => set((state) => ({ session: { ...state.session, policy } })),
      setState: (newState) => set((state) => ({ session: { ...state.session, state: newState } })),
      setRules: (rules) => set((state) => ({ session: { ...state.session, rules } })),
      setScenarios: (scenarios) => set((state) => ({ session: { ...state.session, scenarios } })),
      setEvaluations: (evaluations) => set((state) => ({ session: { ...state.session, evaluations } })),
      setFindings: (findings) => set((state) => ({ session: { ...state.session, findings } })),
      setPatches: (patches) => set((state) => ({ session: { ...state.session, patches } })),
      setError: (error) => set((state) => ({ session: { ...state.session, error } })),
      reset: () => set({ session: initialSession, activeHighlightId: null }),

      activeHighlightId: null,
      setActiveHighlight: (id) => set({ activeHighlightId: id }),

      loadDemo: () => {
        import('@/lib/demo-data').then(({ DEMO_POLICY_TEXT, DEMO_RULES, DEMO_SCENARIOS, DEMO_EVALUATIONS, DEMO_FINDINGS }) => {
          const { setPolicy, setState, setRules, setScenarios, setEvaluations, setFindings, reset } = get();
          reset();
          setPolicy({
            id: "demo-walmart",
            title: "Walmart Return & Coupon Policy",
            rawText: DEMO_POLICY_TEXT,
            sourceType: "url",
            sourceChunks: [],
            createdAt: new Date().toISOString(),
          });
          setState("EXTRACTING_RULES");
          setTimeout(() => { setRules(DEMO_RULES as any); setState("GENERATING_SCENARIOS"); }, 800);
          setTimeout(() => { setScenarios(DEMO_SCENARIOS as any); setState("JUDGING"); }, 1800);
          setTimeout(() => { setEvaluations(DEMO_EVALUATIONS as any); setState("CHALLENGING"); }, 2800);
          setTimeout(() => { setFindings(DEMO_FINDINGS as any); setState("COMPLETE"); }, 3800);
        });
      },

  startAnalysis: async (inputs: {title: string, text: string}[], complianceFramework?: string) => {
    const { setPolicy, setState, setRules, setScenarios, setEvaluations, setFindings, setError } = get();
    
    const runId = `session-${Date.now()}`;
    set((state) => ({ session: { ...state.session, id: runId, rules: [], scenarios: [], evaluations: [], findings: [] }, activeHighlightId: null }));

    try {
      const initialText = inputs.map((input, idx) => `=== Document: ${input.title || 'Untitled Document ' + (idx + 1)} ===\n${input.text}`).join('\n\n');

      setPolicy({
        id: "demo-policy-1",
        title: inputs.length > 1 ? "Multi-Policy Analysis" : inputs[0].title || "Demo Policy",
        rawText: initialText,
        sourceType: "text",
        sourceChunks: [],
        createdAt: new Date().toISOString()
      });
      setState("CLEANING_POLICY");

      const { cleanPolicyAction, extractRulesAction, generateScenariosAction, judgeScenariosAction, aggregateFindingsAction } = await import("@/app/actions/ai-actions");

      const cleanedText = await cleanPolicyAction(initialText);
      if (get().session.id !== runId) return;
      
      setPolicy({ ...get().session.policy!, rawText: cleanedText });

      setState("EXTRACTING_RULES");
      const extractStream = await extractRulesAction(cleanedText);
      for await (const partial of extractStream) {
        if (get().session.id !== runId) return;
        if (partial.error) throw new Error(partial.error);
        if (partial.rules) setRules(partial.rules as any);
        if (partial.sources) {
          setPolicy({ ...get().session.policy!, sourceChunks: partial.sources as any });
        }
      }
      
      setState("GENERATING_SCENARIOS");
      const currentRules = get().session.rules;
      const genStream = await generateScenariosAction(currentRules, cleanedText);
      for await (const partial of genStream) {
        if (get().session.id !== runId) return;
        if (partial.error) throw new Error(partial.error);
        if (partial.scenarios) setScenarios(partial.scenarios as any);
      }
      
      setState("JUDGING");
      const currentScenarios = get().session.scenarios;
      const judgeStream = await judgeScenariosAction(currentScenarios, currentRules, cleanedText, complianceFramework || "None");
      for await (const partial of judgeStream) {
        if (get().session.id !== runId) return;
        if (partial.error) throw new Error(partial.error);
        if (partial.evaluations) setEvaluations(partial.evaluations as any);
      }

      setState("CHALLENGING");
      const currentEvaluations = get().session.evaluations;
      const findingsStream = await aggregateFindingsAction(currentEvaluations, currentRules);
      for await (const partial of findingsStream) {
        if (get().session.id !== runId) return;
        if (partial.error) throw new Error(partial.error);
        if (partial.findings) setFindings(partial.findings as any);
      }
      
      setState("COMPLETE");
    } catch (e: any) {
      if (get().session.id === runId) {
        setError(e.message || "An error occurred during analysis.");
        setState("ERROR");
      }
    }
  },

  challengeRules: async (rulesToChallenge: Rule[]) => {
    const { session, setScenarios, setEvaluations, setFindings, setState, setError } = get();
    if (!session.policy || session.state === "CHALLENGING") return;

    try {
      const { challengePolicyAction, judgeScenariosAction, aggregateFindingsAction } = await import("@/app/actions/ai-actions");
      
      setState("CHALLENGING");
      let newScenarios: any[] = [];
      const chalStream = await challengePolicyAction(rulesToChallenge, session.policy.rawText);
      for await (const partial of chalStream) {
        if (partial.error) throw new Error(partial.error);
        if (partial.scenarios) {
          newScenarios = partial.scenarios;
          setScenarios([...session.scenarios, ...newScenarios]);
        }
      }

      const combinedScenarios = [...session.scenarios, ...newScenarios];
      
      setState("JUDGING");
      const judgeStream = await judgeScenariosAction(combinedScenarios, session.rules, session.policy.rawText, "None");
      for await (const partial of judgeStream) {
        if (partial.error) throw new Error(partial.error);
        if (partial.evaluations) setEvaluations(partial.evaluations as any);
      }

      setState("CHALLENGING"); // Using as aggregation step
      const findingsStream = await aggregateFindingsAction(get().session.evaluations, session.rules);
      for await (const partial of findingsStream) {
        if (partial.error) throw new Error(partial.error);
        if (partial.findings) setFindings(partial.findings as any);
      }

      setState("COMPLETE");
    } catch(e: any) {
      setError(e.message);
      setState("ERROR");
    }
  },

  proposePatch: async (finding: Finding) => {
    const { session, setPatches, setState, setError } = get();
    if (!session.policy) return;

    try {
      setState("PATCH_READY");
      const { proposePatchAction } = await import("@/app/actions/ai-actions");
      
      const patchStream = await proposePatchAction(finding, session.policy.rawText, session.rules);
      let latestPatch: any = null;
      for await (const partial of patchStream) {
        if (partial.error) throw new Error(partial.error);
        if (partial.patch) {
          latestPatch = partial.patch;
          // Update patches array by replacing or adding
          const filtered = session.patches.filter(p => p.findingId !== finding.id);
          setPatches([...filtered, latestPatch]);
        }
      }
    } catch(e: any) {
      setError(e.message);
      setState("ERROR");
    }
  },

  applyPatchAndRegress: async (patch: PatchProposal) => {
    const { session, setState, setError, setPolicy, setEvaluations, setFindings } = get();
    if (!session.policy) return;

    try {
      setState("REGRESSION_RUNNING");
      
      const previousEvaluations = [...session.evaluations];
      const previousFindings = [...session.findings];

      // Simulate patch application
      const patchedText = session.policy.rawText.replace(patch.originalText, patch.proposedText);
      const updatedPolicy = { ...session.policy, rawText: patchedText };
      setPolicy(updatedPolicy);

      const { extractRulesAction, judgeScenariosAction, aggregateFindingsAction } = await import("@/app/actions/ai-actions");

      // Re-extract rules
      let newRules: any[] = [];
      const extractStream = await extractRulesAction(patchedText);
      for await (const partial of extractStream) {
        if (partial.error) throw new Error(partial.error);
        if (partial.rules) {
          newRules = partial.rules as any;
          get().setRules(newRules);
        }
      }

      // Re-evaluate scenarios
      let newEvaluations: any[] = [];
      const judgeStream = await judgeScenariosAction(session.scenarios, newRules, patchedText, "None");
      for await (const partial of judgeStream) {
        if (partial.error) throw new Error(partial.error);
        if (partial.evaluations) {
          newEvaluations = partial.evaluations;
          setEvaluations(newEvaluations);
        }
      }
      
      let newFindings: any[] = [];
      const findingsStream = await aggregateFindingsAction(newEvaluations, newRules);
      for await (const partial of findingsStream) {
        if (partial.error) throw new Error(partial.error);
        if (partial.findings) {
          newFindings = partial.findings;
          setFindings(newFindings);
        }
      }

      // Identify regressions
      const regressions: string[] = [];
      for (const prev of previousEvaluations) {
        if (prev.status === "PASS") {
          const current = newEvaluations.find((e: Evaluation) => e.scenarioId === prev.scenarioId);
          if (current && current.status !== "PASS") {
            regressions.push(prev.scenarioId);
          }
        }
      }

      // Identify resolved findings
      const resolvedFindings: string[] = previousFindings
        .filter(pf => !newFindings.some((nf: Finding) => nf.id === pf.id))
        .map(pf => pf.id);

      const run: RegressionRun = {
        id: `reg-${Date.now()}`,
        timestamp: new Date().toISOString(),
        patchId: patch.id,
        previousEvaluations,
        newEvaluations,
        regressions,
        resolvedFindings
      };

      set((state) => ({ session: { ...state.session, regressionRuns: [...state.session.regressionRuns, run] }}));
      setEvaluations(newEvaluations);
      setFindings(newFindings);
      
      setState("REGRESSION_COMPLETE");
    } catch(e: any) {
      setError(e.message);
      setState("ERROR");
    }
  },

  autoFixAllFindings: async () => {
    const { session, setPatches, setState, setError, setPolicy, setEvaluations, setFindings } = get();
    if (!session.policy || session.findings.length === 0) return;

    try {
      setState("PATCH_READY");

      // 1. Generate patches for all unpatched findings in parallel
      const unpatchedFindings = session.findings.filter(
        (f: Finding) => !session.patches.some((p: PatchProposal) => p.findingId === f.id)
      );

      const { proposePatchAction, extractRulesAction, judgeScenariosAction, aggregateFindingsAction } = await import("@/app/actions/ai-actions");

      const newPatches: PatchProposal[] = [];
      for (const finding of unpatchedFindings) {
        const patchStream = await proposePatchAction(finding, session.policy.rawText, session.rules);
        let latestPatch: any = null;
        for await (const partial of patchStream) {
          if (partial.error) throw new Error(partial.error);
          if (partial.patch) latestPatch = partial.patch;
        }
        if (latestPatch) newPatches.push(latestPatch);
      }

      const allPatches = [...session.patches, ...newPatches];
      setPatches(allPatches);

      if (allPatches.length === 0) return;

      // 2. Apply all patches
      setState("REGRESSION_RUNNING");
      const previousEvaluations = [...session.evaluations];
      const previousFindings = [...session.findings];

      let patchedText = session.policy.rawText;
      for (const patch of allPatches) {
        patchedText = patchedText.replace(patch.originalText, patch.proposedText);
      }

      const updatedPolicy = { ...session.policy, rawText: patchedText };
      setPolicy(updatedPolicy);

      // 3. Re-extract rules
      let newRules: any[] = [];
      const extractStream = await extractRulesAction(patchedText);
      for await (const partial of extractStream) {
        if (partial.error) throw new Error(partial.error);
        if (partial.rules) {
          newRules = partial.rules as any;
          get().setRules(newRules);
        }
      }

      // 4. Re-evaluate scenarios
      let newEvaluations: any[] = [];
      const judgeStream = await judgeScenariosAction(session.scenarios, newRules, patchedText, "None");
      for await (const partial of judgeStream) {
        if (partial.error) throw new Error(partial.error);
        if (partial.evaluations) {
          newEvaluations = partial.evaluations;
          setEvaluations(newEvaluations);
        }
      }
      
      let newFindings: any[] = [];
      const findingsStream = await aggregateFindingsAction(newEvaluations, newRules);
      for await (const partial of findingsStream) {
        if (partial.error) throw new Error(partial.error);
        if (partial.findings) {
          newFindings = partial.findings;
          setFindings(newFindings);
        }
      }

      // 5. Build Regression Run
      const regressions: string[] = [];
      for (const prev of previousEvaluations) {
        if (prev.status === "PASS") {
          const current = newEvaluations.find((e: Evaluation) => e.scenarioId === prev.scenarioId);
          if (current && current.status !== "PASS") {
            regressions.push(prev.scenarioId);
          }
        }
      }

      const resolvedFindings: string[] = previousFindings
        .filter(pf => !newFindings.some((nf: Finding) => nf.id === pf.id))
        .map(pf => pf.id);

      const run: RegressionRun = {
        id: `reg-batch-${Date.now()}`,
        timestamp: new Date().toISOString(),
        patchId: allPatches.map(p => p.id).join(","), // batch patch ID
        previousEvaluations,
        newEvaluations,
        regressions,
        resolvedFindings
      };

      set((state) => ({ session: { ...state.session, regressionRuns: [...state.session.regressionRuns, run] }}));
      setEvaluations(newEvaluations);
      setFindings(newFindings);
      
      setState("REGRESSION_COMPLETE");
    } catch(e: any) {
      setError(e.message || "Batch fixing failed.");
      setState("ERROR");
    }
  }
    }),
    {
      name: 'rulebreak-session-storage',
    }
  )
);
