import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AnalysisSession, Policy, Rule, Scenario, Evaluation, Finding, AnalysisState, PatchProposal, RegressionRun } from '@/types';

const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs = 120000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. The AI model is taking too long to respond.');
    }
    throw error;
  }
};

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
  startAnalysis: (inputs: {title: string, text: string}[]) => Promise<void>;
  challengeRules: (rulesToChallenge: Rule[]) => Promise<void>;
  proposePatch: (finding: Finding) => Promise<void>;
  applyPatchAndRegress: (patch: PatchProposal) => Promise<void>;
  autoFixAllFindings: () => Promise<void>;
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
      reset: () => set({ session: initialSession }),

  startAnalysis: async (inputs: {title: string, text: string}[]) => {
    const { setPolicy, setState, setRules, setScenarios, setEvaluations, setFindings, setError } = get();
    
    // Generate a unique session ID for this run
    const runId = `session-${Date.now()}`;
    set((state) => ({ session: { ...state.session, id: runId } }));

    try {
      // 1. Init
      const policyText = inputs.map((input, idx) => `=== Document: ${input.title || 'Untitled Document ' + (idx + 1)} ===\n${input.text}`).join('\n\n');

      setPolicy({
        id: "demo-policy-1",
        title: inputs.length > 1 ? "Multi-Policy Analysis" : inputs[0].title || "Demo Policy",
        rawText: policyText,
        sourceType: "text",
        sourceChunks: [],
        createdAt: new Date().toISOString()
      });
      setState("CLEANING_POLICY");

      // 1.5 Clean Policy
      const cleanRes = await fetchWithTimeout("/api/policy/clean", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policyText })
      });
      const cleanData = await cleanRes.json();
      if (!cleanData.success) throw new Error(cleanData.error.message);
      
      if (get().session.id !== runId) return;
      
      const { cleanedText } = cleanData.data;
      
      // Update policy with the cleaned text so the rest of the flow uses it
      setPolicy({
        ...get().session.policy!,
        rawText: cleanedText
      });

      setState("EXTRACTING_RULES");

      // 2. Extract
      const extractRes = await fetchWithTimeout("/api/policy/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policyText: cleanedText })
      });
      const extractData = await extractRes.json();
      if (!extractData.success) throw new Error(extractData.error.message);
      
      if (get().session.id !== runId) return; // Abort if session changed
      
      const { rules } = extractData.data;
      setRules(rules);
      setState("GENERATING_SCENARIOS");

      // 3. Generate
      const genRes = await fetchWithTimeout("/api/scenarios/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules, policyText: cleanedText })
      });
      const genData = await genRes.json();
      if (!genData.success) throw new Error(genData.error.message);
      
      if (get().session.id !== runId) return; // Abort if session changed

      const { scenarios } = genData.data;
      setScenarios(scenarios);
      setState("JUDGING");

      // 4. Judge
      const judgeRes = await fetchWithTimeout("/api/scenarios/judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarios, rules, policyText: cleanedText })
      });
      const judgeData = await judgeRes.json();
      if (!judgeData.success) throw new Error(judgeData.error.message);
      
      if (get().session.id !== runId) return; // Abort if session changed

      const { evaluations, findings } = judgeData.data;
      setEvaluations(evaluations);
      setFindings(findings);
      
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
      setState("CHALLENGING");
      
      const res = await fetchWithTimeout("/api/policy/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rulesToChallenge, policyText: session.policy.rawText })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error.message);

      const newScenarios = data.data.scenarios;
      const combinedScenarios = [...session.scenarios, ...newScenarios];
      setScenarios(combinedScenarios);

      // Now judge them
      setState("JUDGING");
      const judgeRes = await fetchWithTimeout("/api/scenarios/judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarios: combinedScenarios, rules: session.rules, policyText: session.policy.rawText })
      });
      const judgeData = await judgeRes.json();
      if (!judgeData.success) throw new Error(judgeData.error.message);

      setEvaluations(judgeData.data.evaluations);
      setFindings(judgeData.data.findings);
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
      const res = await fetchWithTimeout("/api/policy/patch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finding, policyText: session.policy.rawText, rules: session.rules })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error.message);

      // Just append it for MVP
      setPatches([...session.patches, data.data.patch]);
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

      // Re-extract rules
      const extractRes = await fetchWithTimeout("/api/policy/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policyText: patchedText })
      });
      const extractData = await extractRes.json();
      const newRules = extractData.data.rules;
      get().setRules(newRules);

      // Re-evaluate scenarios
      const judgeRes = await fetchWithTimeout("/api/scenarios/judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarios: session.scenarios, rules: newRules, policyText: patchedText })
      });
      const judgeData = await judgeRes.json();
      
      const newEvaluations = judgeData.data.evaluations;
      const newFindings = judgeData.data.findings;

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

      const patchPromises = unpatchedFindings.map((finding: Finding) =>
        fetchWithTimeout("/api/policy/patch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ finding, policyText: session.policy!.rawText, rules: session.rules })
        }).then(res => res.json())
      );

      const patchResults = await Promise.all(patchPromises);
      const newPatches = patchResults
        .filter(r => r.success)
        .map(r => r.data.patch);

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
      const extractRes = await fetchWithTimeout("/api/policy/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policyText: patchedText })
      });
      const extractData = await extractRes.json();
      if (!extractData.success) throw new Error(extractData.error.message);
      const newRules = extractData.data.rules;
      get().setRules(newRules);

      // 4. Re-evaluate scenarios
      const judgeRes = await fetchWithTimeout("/api/scenarios/judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarios: session.scenarios, rules: newRules, policyText: patchedText })
      });
      const judgeData = await judgeRes.json();
      if (!judgeData.success) throw new Error(judgeData.error.message);
      
      const newEvaluations = judgeData.data.evaluations;
      const newFindings = judgeData.data.findings;

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
