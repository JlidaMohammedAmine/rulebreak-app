"use client";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import { FileText, Cpu } from "lucide-react";

const CATEGORY_STYLES: Record<string, string> = {
  // lowercase enum values from schema
  time_limit: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  condition: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  exception: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  restriction: "bg-red-500/15 text-red-400 border-red-500/20",
  action: "bg-teal-500/15 text-teal-400 border-teal-500/20",
  definition: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  other: "bg-slate-500/15 text-slate-400 border-slate-500/20",
  // uppercase fallbacks
  CONDITION: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  EXCEPTION: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  OBLIGATION: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  PERMISSION: "bg-teal-500/15 text-teal-400 border-teal-500/20",
  DEFAULT: "bg-slate-500/15 text-slate-400 border-slate-500/20",
};

export function PolicyPanel() {
  const { session } = useWorkspaceStore();
  const { policy, rules, state } = session;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-black">
      {/* Header */}
      <div className="shrink-0 h-14 px-6 flex items-center justify-between border-b border-white/5">
        <span className="flex items-center gap-2 text-[11px] font-mono text-slate-500 uppercase tracking-widest">
          <FileText className="w-3.5 h-3.5" />
          Source
        </span>
        <span className="text-[11px] font-mono text-slate-600">{rules.length} rules</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Raw policy text */}
        {policy && (
          <div className="p-6 border-b border-white/5">
            <p className="text-[11px] font-mono text-slate-600 uppercase tracking-widest mb-3">Document</p>
            <div className="text-[14px] text-slate-400 leading-relaxed font-serif whitespace-pre-wrap">
              {policy.rawText}
            </div>
          </div>
        )}

        {/* Rules section */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] font-mono text-slate-600 uppercase tracking-widest">Extracted Logic</p>
            {state === "EXTRACTING_RULES" && (
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-indigo-400">
                <Cpu className="w-3.5 h-3.5 animate-pulse" />
                Parsing…
              </div>
            )}
          </div>

          {rules.length === 0 && state !== "EXTRACTING_RULES" && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-800">
              <FileText className="w-8 h-8 mb-3 opacity-30" />
              <p className="text-[11px] font-mono uppercase tracking-widest">Awaiting extraction</p>
            </div>
          )}

          {/* Skeleton while loading */}
          {state === "EXTRACTING_RULES" && rules.length === 0 && (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 rounded border border-white/5 bg-white/[0.01] animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
              ))}
            </div>
          )}

          <div className="space-y-3">
            {rules.map((rule) => {
              const catStyle = CATEGORY_STYLES[rule.category] ?? CATEGORY_STYLES.DEFAULT ?? "text-slate-400 border-slate-500/20";
              return (
                <div
                  key={rule.id}
                  className="group flex gap-3 p-4 rounded border border-white/5 bg-black hover:border-white/10 transition-all cursor-default"
                >
                  <span className="shrink-0 mt-0.5 text-[10px] font-black font-mono text-slate-600 w-7">{rule.id}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] text-slate-200 leading-snug">{rule.statement}</p>
                    <span className={`inline-block mt-2 text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-sm border ${catStyle}`}>
                      {rule.category.replace(/_/g, " ").toUpperCase()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
