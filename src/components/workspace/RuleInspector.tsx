"use client";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import { ShieldCheck, GitCommit, AlertCircle } from "lucide-react";

export function RuleInspector() {
  const { session } = useWorkspaceStore();
  const rules = session.rules;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
        <h2 className="text-sm font-semibold tracking-wider text-slate-400 uppercase">Extracted Rules</h2>
        <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-slate-300">{rules.length} detected</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {rules.length === 0 && (
          <div className="text-center text-sm text-slate-500 mt-10">
            {session.state === "EXTRACTING_RULES" ? "Extracting rules from policy..." : "No rules extracted yet."}
          </div>
        )}
        
        {rules.map((rule) => (
          <div key={rule.id} className="bg-white/5 border border-white/10 rounded-lg p-3 hover:border-white/20 transition-colors cursor-pointer group">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-400 bg-black/50 px-1.5 py-0.5 rounded">{rule.id}</span>
                {rule.category === 'exception' ? (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                )}
              </div>
              <span className="text-[10px] uppercase tracking-wider text-slate-500 group-hover:text-slate-400">{rule.category}</span>
            </div>
            
            <p className="text-sm text-slate-200 leading-snug">{rule.statement}</p>
            
            {rule.conditions && rule.conditions.length > 0 && (
              <div className="mt-3 pt-3 border-t border-white/5 space-y-1">
                {rule.conditions.map((cond, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs font-mono text-slate-400">
                    <GitCommit className="w-3 h-3 text-slate-600" />
                    <span>{cond.field} {cond.operator} {cond.value?.toString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
