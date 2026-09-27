"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, Activity, RotateCcw, Play, Loader2, ChevronRight } from "lucide-react";

import { useWorkspaceStore } from "@/lib/store/workspace-store";
import { PolicyPanel } from "@/components/workspace/PolicyPanel";
import { ScenarioLab } from "@/components/workspace/ScenarioLab";
import { FindingsPanel } from "@/components/workspace/FindingsPanel";
import { RegressionResults } from "@/components/workspace/RegressionResults";

const DEMO_POLICY = `Customers may request a refund within 14 calendar days of purchase.
The product must be unused and returned in its original packaging.
Proof of purchase is required.
Clearance products are final sale.
Defective products may be returned within 30 days.
Shipping fees are non-refundable.
Refunds are issued to the original payment method.`;

const STATE_LABELS: Record<string, { label: string; color: string }> = {
  IDLE: { label: "Idle", color: "text-slate-500" },
  CLEANING_POLICY: { label: "Cleaning Document…", color: "text-purple-400" },
  EXTRACTING_RULES: { label: "Extracting Rules…", color: "text-indigo-400" },
  GENERATING_SCENARIOS: { label: "Generating Scenarios…", color: "text-blue-400" },
  JUDGING: { label: "Evaluating…", color: "text-amber-400" },
  COMPLETE: { label: "Analysis Complete", color: "text-emerald-400" },
  CHALLENGING: { label: "Running Challenge…", color: "text-red-400" },
  PATCH_READY: { label: "Patch Ready", color: "text-emerald-400" },
  REGRESSION_RUNNING: { label: "Running Regression…", color: "text-amber-400" },
  REGRESSION_COMPLETE: { label: "Regression Complete", color: "text-emerald-400" },
  ERROR: { label: "Error", color: "text-red-400" },
};

const isActive = (state: string) =>
  ["CLEANING_POLICY", "EXTRACTING_RULES", "GENERATING_SCENARIOS", "JUDGING", "CHALLENGING", "REGRESSION_RUNNING"].includes(state);

import { Suspense } from 'react';

function WorkspaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";
  const isNew = searchParams.get("new") === "true";
  const { session, startAnalysis, reset } = useWorkspaceStore();
  const [policies, setPolicies] = useState([{ title: isDemo ? "Demo Policy" : "Policy 1", text: isDemo ? DEMO_POLICY : "" }]);
  const [showInput, setShowInput] = useState(session.state === "IDLE");
  const hasAutoStarted = useRef(false);

  useEffect(() => {
    if (isNew) {
      reset();
      setPolicies([{ title: "Policy 1", text: "" }]);
      setShowInput(true);
      router.replace("/workspace");
      return;
    }

    if (isDemo && !hasAutoStarted.current) {
      hasAutoStarted.current = true;
      setShowInput(false);
      reset();
      startAnalysis([{ title: "Demo Policy", text: DEMO_POLICY }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew, isDemo, router, reset]);

  // When analysis completes, hide the input
  useEffect(() => {
    if (session.state !== "IDLE") setShowInput(false);
  }, [session.state]);

  const handleRun = () => {
    const validPolicies = policies.filter(p => p.text.trim());
    if (validPolicies.length === 0) return;
    setShowInput(false);
    startAnalysis(validPolicies);
  };

  const handleReset = () => {
    hasAutoStarted.current = false;
    reset();
    setPolicies([{ title: isDemo ? "Demo Policy" : "Policy 1", text: isDemo ? DEMO_POLICY : "" }]);
    setShowInput(true);
    if (isDemo) router.replace("/workspace");
  };

  const stateInfo = STATE_LABELS[session.state] ?? { label: session.state, color: "text-slate-400" };
  const busy = isActive(session.state);

  return (
    <div className="h-[100dvh] flex flex-col bg-black text-slate-200 overflow-hidden">

      {/* ── Top Bar ── */}
      <header className="shrink-0 h-14 px-6 flex items-center justify-between border-b border-white/5 bg-black z-30">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <span className="font-black tracking-[0.2em] text-white text-xs uppercase">Rulebreak</span>
          {isDemo && (
            <span className="text-[9px] font-mono uppercase tracking-widest text-slate-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-sm">
              Demo
            </span>
          )}
        </Link>

        <div className="flex items-center gap-4">
          {/* Status pill */}
          <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono">
            {busy ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
            ) : (
              <Activity className={`w-3.5 h-3.5 ${stateInfo.color}`} />
            )}
            <span className={stateInfo.color}>{stateInfo.label}</span>
          </div>

          {/* Reset */}
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 h-8 px-3 rounded text-[11px] font-medium text-slate-500 hover:text-white transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </header>

      {/* ── Error Banner ── */}
      {session.error && (
        <div className="shrink-0 flex items-center gap-3 px-6 py-3 bg-black border-b border-red-500/20 text-red-400 text-sm z-20">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span className="font-mono text-[12px]">{session.error}</span>
          <button
            onClick={handleReset}
            className="ml-auto text-[11px] underline hover:no-underline"
          >
            Reset
          </button>
        </div>
      )}

      {/* ── Main Content Area ── */}
      {session.state === "IDLE" ? (
        <main className="flex-1 flex items-center justify-center bg-black p-6">
          <div className="w-full max-w-3xl flex flex-col gap-10 items-center mb-16">
            <div className="flex flex-col items-center gap-4 text-center">
              <div>
                <h1 className="text-3xl font-light text-white tracking-tight mb-3">Analyze Policy</h1>
                <p className="text-[14px] font-light text-slate-500 max-w-lg">
                  Paste your business rules, compliance policy, or terms of service below to discover loopholes and contradictions.
                </p>
              </div>
            </div>
            
            <div className="w-full flex flex-col gap-4">
              {policies.map((p, idx) => (
                <div key={idx} className="w-full bg-black border border-white/10 rounded p-2 transition-all focus-within:border-white/20">
                  <input
                    type="text"
                    value={p.title}
                    onChange={e => {
                      const newPolicies = [...policies];
                      newPolicies[idx].title = e.target.value;
                      setPolicies(newPolicies);
                    }}
                    placeholder={`Document ${idx + 1} Title`}
                    className="w-full bg-transparent p-2 px-4 text-[13px] font-bold text-white placeholder-slate-600 focus:outline-none border-b border-white/5"
                  />
                  <textarea
                    value={p.text}
                    onChange={e => {
                      const newPolicies = [...policies];
                      newPolicies[idx].text = e.target.value;
                      setPolicies(newPolicies);
                    }}
                    rows={6}
                    placeholder="e.g., Customers may request a refund within 14 calendar days of purchase..."
                    className="w-full bg-transparent p-4 text-[14px] font-mono leading-relaxed text-slate-300 placeholder-slate-700 resize-none focus:outline-none"
                  />
                  {policies.length > 1 && (
                    <div className="flex justify-end p-2 border-t border-white/5">
                       <button onClick={() => setPolicies(policies.filter((_, i) => i !== idx))} className="text-[11px] text-red-500 hover:text-red-400">Remove</button>
                    </div>
                  )}
                </div>
              ))}
              
              <div className="flex items-center justify-between mt-2">
                <button
                  onClick={() => setPolicies([...policies, { title: `Policy ${policies.length + 1}`, text: "" }])}
                  className="text-[12px] font-mono text-slate-400 hover:text-white transition-colors"
                >
                  + Add another document
                </button>
                <button
                  onClick={handleRun}
                  disabled={policies.every(p => !p.text.trim())}
                  className="flex items-center gap-2 h-9 px-6 bg-white text-black text-[13px] font-medium rounded-sm hover:bg-slate-200 disabled:opacity-30 transition-all"
                >
                  <Play className="w-3.5 h-3.5" />
                  Run Analysis
                </button>
              </div>
            </div>
          </div>
        </main>
      ) : (
        <>
          {/* ── Progress Bar ── */}
          {busy && (
            <div className="shrink-0 h-0.5 bg-white/5 z-20 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-red-500 via-orange-400 to-amber-400 animate-progress-indeterminate" />
            </div>
          )}

          {/* ── 3-Column Workspace ── */}
          <main className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 bg-black">
            {/* LEFT — Policy & Rules */}
            <div className="w-full lg:w-[340px] lg:min-w-[280px] flex flex-col border-r border-white/5 min-h-0 overflow-hidden">
              <PolicyPanel />
            </div>

            {/* CENTER — Scenario Lab */}
            <div className="flex-1 flex flex-col border-r border-white/5 min-h-0 overflow-hidden">
              <ScenarioLab />
            </div>

            {/* RIGHT — Findings / Regression */}
            <div className="w-full lg:w-[380px] lg:min-w-[300px] flex flex-col min-h-0 overflow-hidden">
              {session.state === "REGRESSION_COMPLETE" ? <RegressionResults /> : <FindingsPanel />}
            </div>
          </main>
        </>
      )}
    </div>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense fallback={<div className="h-screen bg-[#080808] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-white/20" /></div>}>
      <WorkspaceContent />
    </Suspense>
  );
}
