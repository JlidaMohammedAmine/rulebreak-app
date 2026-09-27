"use client";
import { useState } from "react";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import { ShieldCheck, AlertTriangle, CheckCircle2, ArrowUp, ArrowDown, Minus, Copy, Wand2, Loader2 } from "lucide-react";

function Delta({ before, after, lower = false }: { before: number; after: number; lower?: boolean }) {
  const diff = after - before;
  if (diff === 0) return <span className="text-slate-600 text-[10px] font-mono">—</span>;
  const good = lower ? diff < 0 : diff > 0;
  return (
    <span className={`flex items-center gap-0.5 text-[11px] font-bold font-mono ${good ? "text-emerald-400" : "text-red-400"}`}>
      {diff > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
      {Math.abs(diff)}
    </span>
  );
}

export function RegressionResults() {
  const { session } = useWorkspaceStore();
  const [copied, setCopied] = useState(false);
  const [isFormatting, setIsFormatting] = useState(false);
  
  const { findings, regressionRuns } = session;
  const run = regressionRuns[regressionRuns.length - 1];
  if (!run) return null;

  const calc = (evals: any[]) => ({
    pass: evals.filter(e => e.status === "PASS").length,
    fail: evals.filter(e => e.status === "FAIL").length,
    ambiguous: evals.filter(e => e.status === "AMBIGUOUS").length,
    contradiction: evals.filter(e => e.status === "CONTRADICTION").length,
    total: evals.length,
  });

  const before = calc(run.previousEvaluations);
  const after = calc(run.newEvaluations);
  const hasRegression = run.regressions.length > 0;
  const resolved = run.resolvedFindings.length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-black">
      {/* Header */}
      <div className="shrink-0 h-14 px-6 flex items-center justify-between border-b border-white/5">
        <span className="flex items-center gap-2 text-[11px] font-mono text-slate-500 uppercase tracking-widest">
          <ShieldCheck className="w-3.5 h-3.5" />
          Regression Report
        </span>
        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-sm border ${
          hasRegression
            ? "text-red-500 border-red-500/20 bg-red-500/5"
            : "text-emerald-500 border-emerald-500/20 bg-emerald-500/5"
        }`}>
          {hasRegression ? "⚠ REGRESSION" : "✓ CLEAN"}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Regression warning */}
        {hasRegression && (
          <div className="flex items-start gap-3 p-4 rounded border border-red-500/20 bg-red-500/5">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] font-semibold text-red-400">Regression Detected</p>
              <p className="text-[12px] text-red-300/70 mt-0.5">
                {run.regressions.length} previously-passing scenario{run.regressions.length !== 1 ? "s" : ""} now fail after this patch.
              </p>
            </div>
          </div>
        )}

        {/* Score card */}
        <div className="rounded border border-white/5 overflow-hidden">
          <div className="grid grid-cols-3 divide-x divide-white/5">
            <div className="p-3 text-center">
              <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-1">Before</p>
            </div>
            <div className="p-3 text-center">
              <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-1">Metric</p>
            </div>
            <div className="p-3 text-center bg-white/[0.02]">
              <p className="text-[10px] font-mono text-emerald-600 uppercase tracking-widest mb-1">After</p>
            </div>
          </div>

          {[
            { label: "PASS", key: "pass" as const, lower: false },
            { label: "FAIL", key: "fail" as const, lower: true },
            { label: "AMBIGUOUS", key: "ambiguous" as const, lower: true },
            { label: "CONTRADICTION", key: "contradiction" as const, lower: true },
          ].map(({ label, key, lower }) => (
            <div key={key} className="grid grid-cols-3 divide-x divide-white/5 border-t border-white/5">
              <div className="py-3 px-4 text-center">
                <span className="text-[15px] font-black text-slate-400">{before[key]}</span>
              </div>
              <div className="py-3 px-4 flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{label}</span>
                <Delta before={before[key]} after={after[key]} lower={lower} />
              </div>
              <div className="py-3 px-4 text-center bg-white/[0.02]">
                <span className={`text-[15px] font-black ${after[key] < before[key] && lower ? "text-emerald-400" : after[key] > before[key] && !lower ? "text-emerald-400" : "text-slate-400"}`}>
                  {after[key]}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Summary bullets */}
        <div className="space-y-2">
          {resolved > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded border border-emerald-500/15 bg-emerald-500/5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <p className="text-[12px] text-emerald-300">
                <strong>{resolved}</strong> finding{resolved !== 1 ? "s" : ""} resolved by this patch
              </p>
            </div>
          )}
          {hasRegression && (
            <div className="flex items-center gap-3 px-4 py-3 rounded border border-red-500/15 bg-red-500/5">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-[12px] text-red-300">
                <strong>{run.regressions.length}</strong> new regression{run.regressions.length !== 1 ? "s" : ""} introduced
              </p>
            </div>
          )}
        </div>

        {/* Remaining issues */}
        <div>
          <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-3">Remaining Vulnerabilities</p>
          {findings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 rounded border border-emerald-500/10 bg-emerald-500/5 gap-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-500/50" />
              <p className="text-[12px] font-semibold text-emerald-500">System Secure</p>
              <p className="text-[11px] font-mono text-emerald-700">All findings resolved</p>
            </div>
          ) : (
            <div className="space-y-2">
              {findings.map(f => (
                <div key={f.id} className="flex items-center justify-between gap-3 px-4 py-3 rounded border border-white/5 bg-white/[0.01]">
                  <p className="text-[12px] text-slate-300 truncate">{f.description}</p>
                  <span className={`shrink-0 text-[9px] font-bold font-mono px-1.5 py-0.5 rounded-sm border uppercase tracking-widest ${
                    f.severity === "HIGH" ? "text-red-500 border-red-500/20 bg-red-500/5" :
                    f.severity === "MEDIUM" ? "text-orange-500 border-orange-500/20 bg-orange-500/5" :
                    "text-amber-500 border-amber-500/20 bg-amber-500/5"
                  }`}>{f.severity}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Copy Policy Button */}
        <div className="pt-6 mt-6 border-t border-white/5">
          <button
            onClick={async () => {
              if (session.policy?.rawText) {
                setIsFormatting(true);
                try {
                  const res = await fetch("/api/policy/format", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ policyText: session.policy.rawText })
                  });
                  const data = await res.json();
                  if (data.success && data.data.formattedText) {
                    await navigator.clipboard.writeText(data.data.formattedText);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  } else {
                    alert("Failed to format policy.");
                  }
                } catch (e) {
                  alert("Failed to format policy.");
                } finally {
                  setIsFormatting(false);
                }
              }
            }}
            disabled={isFormatting || copied}
            className="w-full flex items-center justify-center gap-2 h-10 bg-white text-black hover:bg-slate-200 text-[13px] font-medium rounded-sm transition-all disabled:opacity-50 disabled:cursor-wait"
          >
            {isFormatting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : copied ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <Wand2 className="w-4 h-4" />
            )}
            {isFormatting ? "Structuring..." : copied ? "Copied to Clipboard!" : "Finalize & Copy Policy"}
          </button>
        </div>
      </div>
    </div>
  );
}
