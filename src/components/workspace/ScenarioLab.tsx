"use client";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import { CheckCircle2, XCircle, AlertCircle, Clock, FlaskConical, Swords } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const STATUS_CONFIG = {
  PASS: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/8 border-emerald-500/15" },
  FAIL: { icon: XCircle, color: "text-red-500", bg: "bg-red-500/8 border-red-500/15" },
  AMBIGUOUS: { icon: AlertCircle, color: "text-amber-500", bg: "bg-amber-500/8 border-amber-500/15" },
  CONTRADICTION: { icon: AlertCircle, color: "text-orange-500", bg: "bg-orange-500/8 border-orange-500/15" },
  MISSING_RULE: { icon: AlertCircle, color: "text-purple-400", bg: "bg-purple-500/8 border-purple-500/15" },
  INSUFFICIENT_INFORMATION: { icon: AlertCircle, color: "text-slate-400", bg: "bg-slate-500/8 border-slate-500/15" },
} as const;

const CAT_COLORS: Record<string, string> = {
  NORMAL: "text-slate-400 bg-slate-500/10 border-slate-500/15",
  BOUNDARY: "text-blue-400 bg-blue-500/10 border-blue-500/15",
  AMBIGUOUS: "text-amber-400 bg-amber-500/10 border-amber-500/15",
  CONTRADICTION: "text-orange-400 bg-orange-500/10 border-orange-500/15",
  EXCEPTION_INTERACTION: "text-purple-400 bg-purple-500/10 border-purple-500/15",
  MISSING_INFORMATION: "text-slate-400 bg-slate-500/10 border-slate-500/15",
  SEQUENCE: "text-cyan-400 bg-cyan-500/10 border-cyan-500/15",
  PRECEDENCE: "text-teal-400 bg-teal-500/10 border-teal-500/15",
  ADVERSARIAL: "text-red-400 bg-red-500/10 border-red-500/15",
};

export function ScenarioLab() {
  const { session } = useWorkspaceStore();
  const { scenarios, evaluations, state } = session;
  const isLoading = state === "GENERATING_SCENARIOS";
  const isChallenging = state === "CHALLENGING";
  const isJudging = state === "JUDGING";

  const passCount = evaluations.filter(e => e.status === "PASS").length;
  const failCount = evaluations.filter(e => e.status !== "PASS" && e.status !== "AMBIGUOUS").length;
  const totalEvals = evaluations.length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-black">
      {/* Header */}
      <div className="shrink-0 h-14 px-6 flex items-center justify-between border-b border-white/5">
        <span className="flex items-center gap-2 text-[11px] font-mono text-slate-500 uppercase tracking-widest">
          <FlaskConical className="w-3.5 h-3.5" />
          Scenario Lab
        </span>
        <div className="flex items-center gap-2">
          {scenarios.length > 0 && (
            <div className="flex items-center gap-1.5 text-[11px] font-mono">
              <span className="text-emerald-500">{passCount}✓</span>
              <span className="text-slate-700">/</span>
              <span className="text-red-500">{failCount}✗</span>
              <span className="text-slate-700">/</span>
              <span className="text-slate-500">{scenarios.length}</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar for judging */}
      {isJudging && totalEvals > 0 && scenarios.length > 0 && (
        <div className="shrink-0 h-px bg-white/5">
          <div
            className="h-full bg-slate-400 transition-all duration-500"
            style={{ width: `${(totalEvals / scenarios.length) * 100}%` }}
          />
        </div>
      )}

      {/* Overlay while generating */}
      <div className="flex-1 overflow-y-auto p-6 relative">
        {(isLoading || isChallenging) && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm gap-4">
            <div className={`flex items-center justify-center w-14 h-14 rounded ${isChallenging ? "bg-red-500/5 border border-red-500/10" : "bg-slate-500/5 border border-slate-500/10"}`}>
              {isChallenging
                ? <Swords className="w-6 h-6 text-red-500 animate-pulse" />
                : <FlaskConical className="w-6 h-6 text-slate-400 animate-pulse" />
              }
            </div>
            <div className="text-center">
              <p className={`text-[13px] font-semibold ${isChallenging ? "text-red-500" : "text-slate-400"}`}>
                {isChallenging ? "Executing Red-Team Attack" : "Generating Adversarial Cases"}
              </p>
              <p className="text-[11px] text-slate-600 mt-1 font-mono uppercase tracking-widest">
                {isChallenging ? "Targeting vulnerabilities" : "Covering edge cases"}
              </p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {scenarios.length === 0 && !isLoading && !isChallenging && (
          <div className="flex flex-col items-center justify-center h-full py-16 text-slate-800">
            <FlaskConical className="w-8 h-8 mb-4 opacity-30" />
            <p className="text-[11px] font-mono uppercase tracking-widest">No scenarios generated</p>
          </div>
        )}

        {/* Skeleton */}
        {isLoading && scenarios.length === 0 && (
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-16 rounded border border-white/5 bg-white/[0.01] animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
            ))}
          </div>
        )}

        {/* Scenario list */}
        <AnimatePresence>
          <div className="space-y-3">
            {scenarios.map((scenario, idx) => {
              const evaluation = evaluations.find(e => e.scenarioId === scenario.id);
              const isChallenge = scenario.id.startsWith("C");
              const statusCfg = evaluation ? STATUS_CONFIG[evaluation.status as keyof typeof STATUS_CONFIG] : null;
              const catColor = CAT_COLORS[scenario.type] ?? CAT_COLORS.NORMAL;

              return (
                <motion.div
                  key={scenario.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.04, 0.8), duration: 0.2 }}
                  className={`rounded border overflow-hidden transition-all ${
                    isChallenge
                      ? "border-red-500/10 bg-red-500/5"
                      : statusCfg
                      ? `${statusCfg.bg.replace('/15', '/5').replace('/8', '/5')}`
                      : "border-white/5 bg-black hover:border-white/10"
                  }`}
                >
                  <div className="flex items-start gap-4 p-4">
                    <div className="shrink-0 flex flex-col items-center gap-2 pt-0.5">
                      <span className="text-[10px] font-black font-mono text-slate-600">{scenario.id}</span>
                      {!evaluation ? (
                        isJudging ? <Clock className="w-3.5 h-3.5 text-slate-600 animate-pulse" /> : null
                      ) : statusCfg ? (
                        <statusCfg.icon className={`w-3.5 h-3.5 ${statusCfg.color}`} />
                      ) : null}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded-sm border uppercase tracking-widest ${catColor}`}>
                          {(scenario.type ?? "").replace(/_/g, " ")}
                        </span>
                        {isChallenge && (
                          <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded-sm border uppercase tracking-widest text-red-500 bg-red-500/5 border-red-500/10 flex items-center gap-1">
                            <Swords className="w-2.5 h-2.5" /> Challenge
                          </span>
                        )}
                      </div>
                      <p className="text-[14px] text-slate-300 leading-snug">{scenario.narrative}</p>
                    </div>
                  </div>

                  {evaluation && evaluation.status !== "PASS" && evaluation.reasoning && (
                    <div className={`px-4 pb-4 pt-0`}>
                      <div className={`text-[12px] font-mono leading-relaxed px-3 py-2 rounded-sm border ${statusCfg?.bg?.replace('/15', '/10').replace('/8', '/5') ?? ""} ${statusCfg?.color ?? "text-slate-400"}`}>
                        <span className="opacity-40 mr-2">↳</span>{evaluation.reasoning}
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
      </div>
    </div>
  );
}
