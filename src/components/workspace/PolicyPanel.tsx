"use client";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import { FileText, Cpu } from "lucide-react";

const CATEGORY_STYLES: Record<string, string> = {
  time_limit: "text-zinc-400 border-zinc-800 bg-zinc-900/50",
  condition: "text-zinc-400 border-zinc-800 bg-zinc-900/50",
  exception: "text-zinc-400 border-zinc-800 bg-zinc-900/50",
  restriction: "text-zinc-400 border-zinc-800 bg-zinc-900/50",
  action: "text-zinc-400 border-zinc-800 bg-zinc-900/50",
  definition: "text-zinc-400 border-zinc-800 bg-zinc-900/50",
  other: "text-zinc-400 border-zinc-800 bg-zinc-900/50",
  CONDITION: "text-zinc-400 border-zinc-800 bg-zinc-900/50",
  EXCEPTION: "text-zinc-400 border-zinc-800 bg-zinc-900/50",
  OBLIGATION: "text-zinc-400 border-zinc-800 bg-zinc-900/50",
  PERMISSION: "text-zinc-400 border-zinc-800 bg-zinc-900/50",
  DEFAULT: "text-zinc-500 border-zinc-800/50 bg-zinc-900/30",
};

export function PolicyPanel() {
  const { session, activeHighlightId, setActiveHighlight } = useWorkspaceStore();
  const { policy, rules, state, findings } = session;

  const getHighlightedTexts = () => {
    if (!activeHighlightId || !policy?.sourceChunks) return [];
    let ruleIds: string[] = [];
    
    if (activeHighlightId.startsWith("F") || activeHighlightId.startsWith("C")) {
      const finding = findings.find(f => f.id === activeHighlightId);
      if (finding) ruleIds = finding.ruleIds;
    } else if (activeHighlightId.startsWith("R")) {
      ruleIds = [activeHighlightId];
    }

    const texts = ruleIds.map(rId => {
      const rule = rules.find(r => r.id === rId);
      if (!rule) return null;
      const chunk = policy.sourceChunks.find(c => c.id === rule.sourceId);
      return chunk ? chunk.text : null;
    }).filter(Boolean) as string[];

    return texts;
  };

  const renderPolicyText = (text: string) => {
    const highlights = getHighlightedTexts();
    
    // Simple approach: if no highlights, just render with document separators
    if (highlights.length === 0) {
      if (!text.includes("=== Document:")) return text;
      const parts = text.split(/(=== Document:.*?===)/g);
      return parts.map((part, i) => {
        if (part.startsWith("=== Document:")) {
          const title = part.replace("=== Document:", "").replace("===", "").trim();
          return (
            <div key={i} className="mt-4 mb-2 first:mt-0 font-bold text-[13px] text-white border-b border-white/10 pb-1 uppercase tracking-wide">
              {title}
            </div>
          );
        }
        return <div key={i} className="mb-4">{part.trim()}</div>;
      });
    }

    // Highlighting logic: this is a naive string replace that works for simple cases
    let currentNodes: React.ReactNode[] = [text];
    
    highlights.forEach((hText) => {
      if (!hText) return;
      const newNodes: React.ReactNode[] = [];
      currentNodes.forEach((node, i) => {
        if (typeof node === "string") {
          const parts = node.split(hText);
          parts.forEach((part, j) => {
            newNodes.push(part);
            if (j < parts.length - 1) {
              newNodes.push(
                <mark key={`${i}-${j}`} className="bg-amber-500/30 text-amber-100 px-0.5 rounded shadow-[0_0_10px_rgba(245,158,11,0.2)] transition-all duration-300">
                  {hText}
                </mark>
              );
            }
          });
        } else {
          newNodes.push(node);
        }
      });
      currentNodes = newNodes;
    });

    // Handle document separators inside the nodes
    return currentNodes.map((node, idx) => {
      if (typeof node === "string" && node.includes("=== Document:")) {
         const parts = node.split(/(=== Document:.*?===)/g);
         return (
           <span key={idx}>
             {parts.map((p, pIdx) => {
               if (p.startsWith("=== Document:")) {
                 const title = p.replace("=== Document:", "").replace("===", "").trim();
                 return <div key={pIdx} className="mt-4 mb-2 font-bold text-[13px] text-white border-b border-white/10 pb-1 uppercase tracking-wide block">{title}</div>;
               }
               return <span key={pIdx}>{p}</span>;
             })}
           </span>
         );
      }
      return <span key={idx}>{node}</span>;
    });
  };

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
              {renderPolicyText(policy.rawText)}
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
                  className={`group flex gap-3 p-4 rounded border transition-all duration-300 cursor-default ${
                    activeHighlightId === rule.id 
                      ? 'border-zinc-500 bg-zinc-900 shadow-[0_0_15px_rgba(255,255,255,0.05)]' 
                      : 'border-zinc-800/50 bg-[#0A0A0A] hover:border-zinc-700/50 hover:bg-zinc-900/50'
                  }`}
                  onMouseEnter={() => setActiveHighlight(rule.id)}
                  onMouseLeave={() => setActiveHighlight(null)}
                >
                  <div className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-zinc-700 group-hover:bg-zinc-500 transition-colors" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] text-zinc-300 leading-snug">{rule.statement}</p>
                    <span className={`inline-block mt-2 text-[9px] font-bold font-mono px-1.5 py-0.5 rounded-sm border ${catStyle} uppercase tracking-wider`}>
                      {rule.category.replace(/_/g, " ")}
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
