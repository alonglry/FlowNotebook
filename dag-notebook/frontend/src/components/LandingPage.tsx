import React, { useState } from 'react';
import {
  Workflow,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Code2,
  Download,
  Cloud,
  Layers,
  Play,
  Check,
  ChevronRight,
  CheckCircle2,
  Laptop
} from 'lucide-react';
import { useGraphStore } from '../store/useGraphStore';
import { storageManager } from '../services/storage';

export const LandingPage: React.FC = () => {
  const setCurrentView = useGraphStore((state) => state.setCurrentView);
  const setCurrentUser = useGraphStore((state) => state.setCurrentUser);
  const openPipeline = useGraphStore((state) => state.openPipeline);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    try {
      const user = await storageManager.googleDriveProvider.signIn();
      if (user) {
        setCurrentUser(user);
        setCurrentView('dashboard');
      }
    } catch (e) {
      console.error('Sign in error:', e);
    }
    setIsSigningIn(false);
  };

  const handleTryDemo = () => {
    openPipeline('pipe_quant_alpha');
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 font-sans selection:bg-sky-500 selection:text-white flex flex-col overflow-x-hidden">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#070b14]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentView('landing')}>
            <div className="p-2 bg-gradient-to-tr from-sky-500 to-indigo-600 rounded-xl shadow-lg shadow-sky-500/20">
              <Workflow className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-lg tracking-tight text-white">FlowNotebook</span>
              <span className="px-2 py-0.5 rounded-full bg-sky-950/80 border border-sky-800 text-sky-400 text-[10px] font-bold uppercase tracking-wider">
                Python DAG
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setCurrentView('dashboard')}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              Dashboard
            </button>
            <button
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
              className="hidden sm:flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 text-xs font-medium text-slate-200 transition-all cursor-pointer"
            >
              <Cloud className="w-3.5 h-3.5 text-sky-400" />
              <span>{isSigningIn ? 'Connecting...' : 'Sign In with Google'}</span>
            </button>
            <button
              onClick={handleTryDemo}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-xs font-bold text-white shadow-lg shadow-sky-500/25 transition-all transform active:scale-95 cursor-pointer"
            >
              <span>Launch Canvas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 md:pt-28 md:pb-24 px-6 overflow-hidden">
        {/* Glow ambient backgrounds */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-sky-600/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/3 w-[450px] h-[300px] bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center space-y-7 relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
            <span className="text-xs font-medium text-slate-300">
              The Next-Generation Visual Execution Engine for Python
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.12]">
            Escape the Spaghetti Code of <br />
            <span className="bg-gradient-to-r from-sky-400 via-indigo-300 to-teal-300 bg-clip-text text-transparent">
              Linear Jupyter Notebooks
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Position Python code blocks freely on a 2D canvas, route data dependencies across visual ports, and execute with zero hidden-state mutations and live WebSocket telemetry.
          </p>

          {/* Action CTAs */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <button
              onClick={handleTryDemo}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-sm font-bold text-white shadow-xl shadow-sky-500/25 flex items-center justify-center space-x-2 transition-all transform hover:-translate-y-0.5 active:scale-95 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Try Live Interactive Demo</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-sm font-semibold text-slate-200 flex items-center justify-center space-x-2.5 transition-all shadow-md cursor-pointer"
            >
              <Cloud className="w-4 h-4 text-sky-400" />
              <span>{isSigningIn ? 'Connecting...' : 'Sign in with Google Drive'}</span>
            </button>

            <button
              onClick={() => setCurrentView('dashboard')}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800 text-sm font-semibold text-slate-300 hover:text-white flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Browse Pipelines</span>
            </button>
          </div>

          {/* Trust bullets */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-medium">
            <div className="flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Zero-Mutation Namespaces</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Real-Time WebSocket Streaming</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>100% Free Google Drive Sync</span>
            </div>
          </div>
        </div>

        {/* Hero Interactive Canvas Preview */}
        <div className="max-w-6xl mx-auto mt-14 relative z-10">
          <div className="rounded-2xl border border-slate-700/80 bg-gradient-to-b from-slate-900 to-[#0b101d] p-2 shadow-2xl shadow-sky-950/40 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-[#0d1424] rounded-t-xl text-xs text-slate-400">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                <span className="ml-2 font-mono text-[11px] text-slate-400">FlowNotebook Canvas — Quantitative Trading Strategy</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px] font-mono font-bold">DAG VALID</span>
                <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-400 text-[10px] font-mono">4 Nodes Connected</span>
              </div>
            </div>

            <div className="relative group cursor-pointer" onClick={handleTryDemo}>
              <img
                src="/src/image/demo 1.png"
                alt="FlowNotebook 2D DAG Canvas Interface"
                className="w-full h-auto rounded-b-xl object-cover transition-transform duration-300 group-hover:scale-[1.005]"
              />
              <div className="absolute inset-0 bg-sky-950/20 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="px-5 py-2.5 rounded-xl bg-sky-600 text-white font-bold text-xs shadow-lg flex items-center space-x-2">
                  <Play className="w-4 h-4 fill-current" />
                  <span>Click to Open Interactive Workspace</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-20 px-6 border-t border-slate-800/80 bg-[#0a0f1d]/60 relative">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Built for Modern Python Engineering
            </h2>
            <p className="text-sm text-slate-400">
              Everything you love about Jupyter Notebooks, redesigned with graph architectures and data immutability.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-sky-500/50 transition-all space-y-4">
              <div className="w-10 h-10 rounded-xl bg-sky-950 border border-sky-800 text-sky-400 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">No Hidden State Mutations</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Linear Jupyter notebooks let cells run out of order, creating invisible state bugs. FlowNotebook passes data between isolated namespaces with defensive PyArrow copying. Downstream nodes can never corrupt upstream DataFrames.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-indigo-500/50 transition-all space-y-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-950 border border-indigo-800 text-indigo-400 flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">4-Port Magnetic Connectors</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Every code block features Top, Bottom, Left, and Right connection points that stay clean and invisible until you hover or drag a wire. Click any connecting line to delete or restructure dependencies instantly.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-emerald-500/50 transition-all space-y-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center">
                <Code2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Embedded VS Code Monaco Editor</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Full-powered editor inside every block. Need more focus? Click to maximize any node into a full-screen split workspace featuring high-res Python code editing and live tabular DataFrame viewers.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-amber-500/50 transition-all space-y-4">
              <div className="w-10 h-10 rounded-xl bg-amber-950 border border-amber-800 text-amber-400 flex items-center justify-center">
                <Download className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">1-Click Standalone .py Compiler</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Transform your visual DAG into a clean, modular, standalone Python script ready for automated cron jobs, Airflow workers, or quantitative production trading servers.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-purple-500/50 transition-all space-y-4">
              <div className="w-10 h-10 rounded-xl bg-purple-950 border border-purple-800 text-purple-400 flex items-center justify-center">
                <Cloud className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Google Drive Cloud Storage</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Sign in with Google to automatically save, organize, and open your pipelines from your personal Google Drive (`/FlowNotebook/`). 100% private, zero server database lock-in.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-teal-500/50 transition-all space-y-4">
              <div className="w-10 h-10 rounded-xl bg-teal-950 border border-teal-800 text-teal-400 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Interactive DataFrame Inspector</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Say goodbye to truncated stdout logs. FlowNotebook renders rich interactive tables with pagination, column schemas, shapes, and variable type inspectors directly beneath each code node.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-20 px-6 border-t border-slate-800/80 bg-[#070b14]">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Why Engineers are Switching from Linear Notebooks
            </h2>
            <p className="text-sm text-slate-400">
              A direct comparison between linear notebooks and DAG canvas execution.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Jupyter */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-rose-950/60 space-y-4">
              <div className="flex items-center space-x-2 text-rose-400 text-sm font-bold">
                <Laptop className="w-4 h-4" />
                <span>Traditional Jupyter Notebooks</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-400">
                <li className="flex items-start space-x-2">
                  <span className="text-rose-400 font-bold">✕</span>
                  <span><strong>Linear execution only:</strong> Impossible to visualize branched logic or parallel multi-model experiments.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-rose-400 font-bold">✕</span>
                  <span><strong>Out-of-order race conditions:</strong> Running cell 5 before cell 2 creates un-reproducible phantom bugs.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-rose-400 font-bold">✕</span>
                  <span><strong>Global shared mutable state:</strong> In-place mutation in one cell accidentally ruins earlier datasets.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-rose-400 font-bold">✕</span>
                  <span><strong>Hard to deploy:</strong> Exporting to production `.py` requires manual refactoring and cleanup.</span>
                </li>
              </ul>
            </div>

            {/* FlowNotebook */}
            <div className="p-6 rounded-2xl bg-gradient-to-b from-sky-950/30 to-slate-900/60 border border-sky-800/80 space-y-4 shadow-xl">
              <div className="flex items-center space-x-2 text-sky-400 text-sm font-bold">
                <Workflow className="w-4 h-4" />
                <span>FlowNotebook DAG Canvas</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-300">
                <li className="flex items-start space-x-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Visual 2D Directed Graph:</strong> Freely position, route, and visualize multi-branch data pipelines.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Topological execution:</strong> Automatic dependency sorting ensures nodes always run in mathematically correct order.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Defensive copy immutability:</strong> Intermediate variables are protected with zero mutation risk.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Instant clean Python export:</strong> 1-click generation of modular, production-ready `.py` scripts.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Maximized Focus Preview Showcase */}
      <section className="py-20 px-6 border-t border-slate-800/80 bg-[#0a0f1d]/80">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-10">
          <div className="flex-1 space-y-4">
            <span className="px-2.5 py-1 rounded-md bg-indigo-950 text-indigo-400 text-[10px] font-bold uppercase tracking-wider border border-indigo-800">
              Focus Workspace
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Full-Screen Split Code & Data Inspector
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              When you need deep focus, click the Maximize icon on any node. Work in a full-height Monaco Python editor on the left while simultaneously inspecting live streaming logs, execution errors, and interactive Pandas DataFrames on the right.
            </p>
            <div className="pt-2">
              <button
                onClick={handleTryDemo}
                className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white transition-all shadow-md flex items-center space-x-2 cursor-pointer"
              >
                <span>Experience Focus Mode</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex-1 rounded-2xl border border-slate-700/80 bg-slate-900 p-2 shadow-2xl overflow-hidden">
            <img
              src="/src/image/demo 2.png"
              alt="FlowNotebook Maximized Focus Mode"
              className="w-full h-auto rounded-xl object-cover"
            />
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="py-20 px-6 border-t border-slate-800 bg-gradient-to-b from-[#0e1628] to-[#070b14] text-center relative overflow-hidden">
        <div className="max-w-3xl mx-auto space-y-6 relative z-10">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            Ready to Build Visual Python Pipelines?
          </h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            Experience the simplicity of 2D DAG execution. Zero installation required.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleTryDemo}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-sm font-bold text-white shadow-xl shadow-sky-500/25 flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Launch FlowNotebook Now</span>
            </button>
            <button
              onClick={handleGoogleSignIn}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sm font-semibold text-slate-200 flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Cloud className="w-4 h-4 text-sky-400" />
              <span>Connect Google Drive</span>
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-slate-800/80 bg-[#05080f] text-xs text-slate-500 text-center">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Workflow className="w-4 h-4 text-sky-400" />
            <span className="font-semibold text-slate-400">FlowNotebook</span>
            <span>— The Visual Python DAG Execution Platform</span>
          </div>
          <div>Licensed under MIT. Open-source core.</div>
        </div>
      </footer>
    </div>
  );
};
