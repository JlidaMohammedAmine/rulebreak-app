import Link from "next/link";
import { ArrowRight, ShieldAlert, Zap, Search, Hammer, ChevronRight, GitBranch, Lock, BarChart3 } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#080808] text-slate-200 flex flex-col font-sans relative overflow-hidden">

      {/* Background: subtle grid + radial glow */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff04_1px,transparent_1px),linear-gradient(to_bottom,#ffffff04_1px,transparent_1px)] bg-[size:56px_56px] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-red-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Nav */}
      <header className="relative z-10 h-16 flex items-center justify-between px-8 border-b border-white/[0.06]">
        <Link href="/" className="flex items-center gap-2.5">
          <ShieldAlert className="w-5 h-5 text-red-500" />
          <span className="font-bold tracking-[0.2em] text-white text-sm uppercase">Rulebreak</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-[13px] font-medium text-slate-500">
          <a href="#how" className="hover:text-slate-200 transition-colors">How it works</a>
          <a href="#" className="hover:text-slate-200 transition-colors">Docs</a>
          <a href="https://github.com" target="_blank" className="hover:text-slate-200 transition-colors">GitHub</a>
        </nav>
        <Link
          href="/workspace?demo=true"
          className="hidden md:flex items-center gap-2 h-9 px-4 text-xs font-semibold bg-white text-black rounded-md hover:bg-slate-100 transition-colors"
        >
          Try Demo <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pt-24 pb-16 text-center">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-red-500/25 bg-red-500/8 text-red-400 text-[11px] font-mono uppercase tracking-[0.15em] mb-10">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
          </span>
          AI Policy Red-Team Engine
        </div>

        {/* Headline */}
        <h1 className="text-[clamp(2.8rem,8vw,6rem)] font-black text-white tracking-tight leading-[0.95] max-w-4xl">
          Give us your rules.
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-br from-red-400 via-orange-400 to-amber-400">
            We'll break them.
          </span>
        </h1>

        <p className="mt-8 text-[17px] text-slate-400 max-w-xl leading-relaxed font-light">
          Paste any natural-language policy. RULEBREAK extracts the logic, attacks every edge case with adversarial AI, finds the contradictions, and proves the fix.
        </p>

        {/* CTAs */}
        <div className="mt-12 flex flex-col sm:flex-row items-center gap-3">
          <Link
            href="/workspace?demo=true"
            className="group flex items-center gap-3 h-14 px-8 bg-white text-black text-[15px] font-bold rounded-xl hover:bg-slate-100 transition-all shadow-[0_0_40px_rgba(255,255,255,0.12)] hover:shadow-[0_0_60px_rgba(255,255,255,0.2)]"
          >
            Run Live Demo
            <span className="flex items-center justify-center w-6 h-6 bg-black/10 rounded-lg group-hover:translate-x-0.5 transition-transform">
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </Link>
          <Link
            href="/workspace?new=true"
            className="flex items-center gap-2 h-14 px-8 border border-white/12 text-slate-300 text-[15px] font-medium rounded-xl hover:bg-white/5 hover:border-white/20 transition-all"
          >
            <Hammer className="w-4 h-4 opacity-70" />
            Input Custom Policy
          </Link>
        </div>

        {/* Social proof strip */}
        <p className="mt-8 text-[12px] text-slate-600 font-mono">
          Runs in &lt;30 seconds · No signup required · 100% local demo
        </p>

        {/* How it works */}
        <section id="how" className="mt-32 w-full max-w-5xl text-left">
          <p className="text-xs font-mono text-slate-600 uppercase tracking-[0.2em] mb-8 text-center">How it works</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                step: "01",
                icon: Search,
                title: "Extract & Map",
                desc: "Parses your natural-language policy into discrete logical conditions, dependencies, and exception rules.",
                accent: "red",
              },
              {
                step: "02",
                icon: Zap,
                title: "Adversarial Attack",
                desc: "Generates boundary collisions, contradictory cases, missing-info scenarios, and targeted adversarial probes.",
                accent: "orange",
              },
              {
                step: "03",
                icon: Hammer,
                title: "Patch & Prove",
                desc: "Proposes exact text patches to resolve every contradiction, then reruns all scenarios to prove the fix.",
                accent: "emerald",
              },
            ].map(({ step, icon: Icon, title, desc, accent }) => (
              <div key={step} className={`relative p-6 rounded-xl border bg-white/[0.025] border-white/8 overflow-hidden group hover:border-white/15 transition-all duration-300`}>
                <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent ${accent === "red" ? "via-red-500" : accent === "orange" ? "via-orange-500" : "via-emerald-500"} to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
                <span className="text-[11px] font-mono text-slate-600 mb-4 block">{step}</span>
                <Icon className="w-7 h-7 text-slate-300 mb-4" />
                <h3 className="text-[15px] font-semibold text-white mb-2">{title}</h3>
                <p className="text-[13px] text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Stats strip */}
        <div className="mt-20 w-full max-w-5xl grid grid-cols-3 divide-x divide-white/[0.06] border border-white/[0.06] rounded-xl overflow-hidden">
          {[
            { label: "Scenario Categories", value: "9" },
            { label: "Finding Types", value: "6" },
            { label: "Avg. Analysis Time", value: "~8s" },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col items-center justify-center py-8 px-4 bg-white/[0.02]">
              <span className="text-3xl font-black text-white">{value}</span>
              <span className="text-[12px] text-slate-500 mt-1 font-mono uppercase tracking-widest">{label}</span>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 border-t border-white/[0.06] text-center text-[12px] text-slate-600 font-mono">
        RULEBREAK — AI Hackathon 2026
      </footer>
    </div>
  );
}
