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
  const { policy, rules, findings, state } = session;

  const renderPolicyText = (text: string) => {
    let highlightedChunks: string[] = [];

    // Map the activeHighlightId (either Rule ID or Finding ID) to source chunks
    if (activeHighlightId && policy?.sourceChunks) {
      if (activeHighlightId.startsWith("F") || activeHighlightId.startsWith("C")) {
        const finding = findings.find(f => f.id === activeHighlightId);
        if (finding) {
          finding.ruleIds.forEach(ruleId => {
            const rule = rules.find(r => r.id === ruleId);
            if (rule) {
              const ruleChunks = policy.sourceChunks!.filter(c => c.id === rule.sourceId).map(c => c.text);
              highlightedChunks.push(...ruleChunks);
            }
          });
        }
      } else {
        const rule = rules.find(r => r.id === activeHighlightId);
        if (rule) {
          const ruleChunks = policy.sourceChunks.filter(c => c.id === rule.sourceId).map(c => c.text);
          highlightedChunks.push(...ruleChunks);
        }
      }
    }

    if (text.includes("=== Document:")) {
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

        let paragraphText = part.trim();
        if (highlightedChunks.length > 0) {
          highlightedChunks.forEach(chunk => {
            if (paragraphText.includes(chunk)) {
              paragraphText = paragraphText.replace(
                chunk, 
                `<mark class="bg-amber-500/20 text-amber-200 rounded px-1 transition-colors duration-300 font-medium">${chunk}</mark>`
              );
            }
          });
        }

        return <div key={i} className="mb-4" dangerouslySetInnerHTML={{ __html: paragraphText }} />;
      });
    }

    let paragraphText = text;
    if (highlightedChunks.length > 0) {
      highlightedChunks.forEach(chunk => {
        if (paragraphText.includes(chunk)) {
          paragraphText = paragraphText.replace(
            chunk, 
            `<mark class="bg-amber-500/20 text-amber-200 rounded px-1 transition-colors duration-300 font-medium">${chunk}</mark>`
          );
        }
      });
    }
    
    return <div dangerouslySetInnerHTML={{ __html: paragraphText }} />;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0A0A0A]">
      <div className="shrink-0 h-14 px-6 flex items-center justify-between border-b border-white/5 bg-black z-10">
        <span className="flex items-center gap-2 text-[11px] font-mono text-zinc-500 uppercase tracking-widest">
          <FileText className="w-3.5 h-3.5" />
          Source Document
        </span>
        <span className="text-[11px] font-mono text-zinc-600">{rules.length} rules</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {policy && (
          <div className="p-6 border-b border-white/5 bg-[#050505]">
            <div className="text-[14px] text-zinc-300 leading-relaxed font-serif whitespace-pre-wrap">
              {renderPolicyText(policy.rawText)}
            </div>
          </div>
        )}

        <div className="p-6">
          <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5" /> Extracted Rules
          </p>

          {state === "EXTRACTING_RULES" && rules.length === 0 && (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 rounded border border-white/5 bg-white/[0.01] animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
              ))}
            </div>
          )}

          <div className="space-y-3">
            {rules.map((rule) => {
              const catStyle = CATEGORY_STYLES[rule.category] ?? CATEGORY_STYLES.DEFAULT ?? "text-zinc-400 border-zinc-800/50 bg-zinc-900/30";
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
