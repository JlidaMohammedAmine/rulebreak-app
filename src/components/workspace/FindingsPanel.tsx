"use client";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import { Finding } from "@/types";
import {
  AlertTriangle, Swords, Wrench, ShieldAlert, Sparkles,
  ChevronRight, Loader2, CheckCircle2
} from "lucide-react";

const SEVERITY_CONFIG = {
  HIGH: { dot: "bg-red-500", label: "text-red-400", border: "border-red-500/20", bg: "bg-red-500/8" },
  MEDIUM: { dot: "bg-orange-500", label: "text-orange-400", border: "border-orange-500/20", bg: "bg-orange-500/8" },
  LOW: { dot: "bg-amber-500", label: "text-amber-400", border: "border-amber-500/20", bg: "bg-amber-500/8" },
};

const TYPE_LABELS: Record<string, string> = {
  CONTRADICTION: "Contradiction",
  AMBIGUITY: "Ambiguity",
  MISSING_RULE: "Missing Rule",
  PRECEDENCE_CONFLICT: "Precedence Conflict",
  EXCEPTION_CONFLICT: "Exception Conflict",
  UNDEFINED_TERM: "Undefined Term",
  COMPLIANCE_VIOLATION: "Compliance Violation",
};

export function FindingsPanel() {
  const { session, challengeRules, proposePatch, applyPatchAndRegress } = useWorkspaceStore();
  const { findings, patches, state } = session;

  const isIdle = ["IDLE", "EXTRACTING_RULES", "GENERATING_SCENARIOS"].includes(state);
  const isJudging = state === "JUDGING";
  const isChallenging = state === "CHALLENGING";
  const isPatchReady = state === "PATCH_READY";

  const handleChallenge = (finding: Finding) => {
    const rulesToChallenge = session.rules.filter(r => finding.ruleIds.includes(r.id));
    challengeRules(rulesToChallenge);
  };

  const handleProposeFix = (finding: Finding) => proposePatch(finding);

  const handleAcceptPatch = (patchId: string) => {
    const patch = patches.find(p => p.id === patchId);
    if (patch) applyPatchAndRegress(patch);
  };

  const isRegressionRunning = state === "REGRESSION_RUNNING";
  const isBatchFixing = state === "PATCH_READY" && session.patches.length > 1; // simple heuristic

  // ── Waiting state ──
  if (isIdle || isJudging || isRegressionRunning || isBatchFixing) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-black">
        <div className="shrink-0 h-14 px-6 flex items-center border-b border-white/5">
          <span className="flex items-center gap-2 text-[11px] font-mono text-slate-500 uppercase tracking-widest">
            <ShieldAlert className="w-3.5 h-3.5" />
            Findings
          </span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-slate-800">
          {(isJudging || isRegressionRunning || isBatchFixing) ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin text-slate-600" />
              <p className="text-[11px] uppercase tracking-widest font-mono text-slate-600">
                {isRegressionRunning ? "Running regression…" :
                 isBatchFixing ? "Generating patches…" :
                 "Evaluating scenarios…"}
              </p>
            </>
          ) : (
            <>
              <ShieldAlert className="w-8 h-8 opacity-30" />
              <p className="text-[11px] font-mono uppercase tracking-widest">Awaiting analysis</p>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Results ──
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-black">
      {/* Header */}
      <div className="shrink-0 h-14 px-6 flex items-center justify-between border-b border-white/5">
        <span className="flex items-center gap-2 text-[11px] font-mono text-slate-500 uppercase tracking-widest">
          <ShieldAlert className="w-3.5 h-3.5" />
          Findings
        </span>
        <div className="flex items-center gap-4">
          {findings.length > 0 && findings.some(f => !patches.some(p => p.findingId === f.id)) && (
            <button
              onClick={() => useWorkspaceStore.getState().autoFixAllFindings()}
              disabled={isPatchReady || isChallenging}
              className="flex items-center gap-1.5 h-7 px-3 bg-emerald-500/5 text-emerald-500 hover:bg-emerald-500/10 border border-emerald-500/10 rounded-sm text-[10px] font-bold font-mono uppercase tracking-widest transition-all disabled:opacity-30"
            >
              {isPatchReady ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wrench className="w-3 h-3" />}
              Fix All
            </button>
          )}
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${findings.length > 0 ? "bg-red-500" : "bg-emerald-500"}`} />
            <span className="text-[11px] font-mono text-slate-500">{findings.length} issues</span>
          </div>
        </div>
      </div>

      {/* No findings */}
      {findings.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-600">
          <CheckCircle2 className="w-8 h-8 text-emerald-500/30" />
          <p className="text-[14px] font-light text-emerald-600">No vulnerabilities found</p>
          <p className="text-[11px] font-mono text-slate-700 uppercase tracking-widest">Policy passed all scenarios</p>
        </div>
      )}

      {/* Finding list */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {findings.map((finding) => {
          const sev = SEVERITY_CONFIG[finding.severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.LOW;
          const existingPatch = patches.find(p => p.findingId === finding.id);

          return (
            <div
              key={finding.id}
              className={`rounded border overflow-hidden ${sev.border} ${sev.bg.replace('/8', '/5')}`}
            >
              {/* Finding header */}
              <div className="px-5 pt-5 pb-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${sev.dot}`} />
                    <span className={`text-[11px] font-bold font-mono uppercase tracking-widest ${sev.label}`}>
                      {TYPE_LABELS[finding.type] ?? finding.type.replace(/_/g, " ")}
                    </span>
                  </div>
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-sm border ${sev.border} ${sev.label} opacity-80`}>
                    {finding.severity}
                  </span>
                </div>
                <p className="text-[14px] text-slate-200 leading-snug font-medium">{finding.description}</p>
              </div>

              {/* Evidence */}
              <div className="px-5 pb-4">
                <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-2">Evidence</p>
                <div className="text-[12px] text-slate-400 font-mono bg-black rounded p-3 border border-white/5 leading-relaxed">
                  {finding.evidence.split(/(R\d{2})/).map((part, i) =>
                    /^R\d{2}$/.test(part) ? (
                      <span key={i} className="inline-flex items-center mx-0.5 px-1 py-0 text-[10px] font-black bg-white/5 text-slate-300 rounded-sm border border-white/10">
                        {part}
                      </span>
                    ) : <span key={i}>{part}</span>
                  )}
                </div>
              </div>

              {/* Patch display */}
              {existingPatch && (
                <div className="mx-5 mb-5 rounded border border-emerald-500/10 bg-emerald-500/5 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2 border-b border-emerald-500/10">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-[10px] font-mono font-bold text-emerald-500 uppercase tracking-widest">Proposed Patch</span>
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <span className="text-[9px] font-mono text-slate-600 uppercase tracking-widest">Remove</span>
                      <div className="mt-1.5 text-[12px] text-red-400/80 line-through bg-red-500/5 rounded px-2.5 py-2 border border-red-500/10 font-mono">
                        {existingPatch.originalText}
                      </div>
                    </div>
                    <div>
                      <span className="text-[9px] font-mono text-slate-600 uppercase tracking-widest">Insert</span>
                      <div className="mt-1.5 text-[12px] text-emerald-400 bg-emerald-500/5 rounded px-2.5 py-2 border border-emerald-500/10 font-mono">
                        {existingPatch.proposedText}
                      </div>
                    </div>
                  </div>
                  <div className="px-4 pb-4">
                    <button
                      onClick={() => handleAcceptPatch(existingPatch.id)}
                      className="w-full flex items-center justify-center gap-2 h-9 bg-emerald-600 hover:bg-emerald-500 text-white text-[12px] font-medium rounded-sm transition-all shadow-[0_0_15px_rgba(16,185,129,0.1)] hover:shadow-[0_0_25px_rgba(16,185,129,0.2)]"
                    >
                      Accept Patch & Regress
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              {!existingPatch && (
                <div className="px-5 pb-5 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleChallenge(finding)}
                    disabled={isChallenging}
                    className="flex items-center justify-center gap-1.5 h-9 rounded-sm border border-red-500/20 bg-red-500/5 text-red-500 text-[12px] font-medium hover:bg-red-500/10 hover:border-red-500/30 disabled:opacity-30 transition-all"
                  >
                    {isChallenging
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Attacking…</>
                      : <><Swords className="w-3.5 h-3.5" /> Challenge</>
                    }
                  </button>
                  <button
                    onClick={() => handleProposeFix(finding)}
                    disabled={isPatchReady}
                    className="flex items-center justify-center gap-1.5 h-9 rounded-sm bg-white text-black text-[12px] font-medium hover:bg-slate-200 disabled:opacity-30 transition-all"
                  >
                    {isPatchReady
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Patching…</>
                      : <><Wrench className="w-3.5 h-3.5" /> Propose Fix</>
                    }
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
