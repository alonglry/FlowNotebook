import React from 'react';
import {
  Play,
  Plus,
  Download,
  RotateCcw,
  Workflow,
  Loader2,
} from 'lucide-react';
import { useGraphStore } from '../store/useGraphStore';

export const TopBar: React.FC = () => {
  const wsStatus = useGraphStore((state) => state.wsStatus);
  const isGraphRunning = useGraphStore((state) => state.isGraphRunning);
  const runGraph = useGraphStore((state) => state.runGraph);
  const addNewNode = useGraphStore((state) => state.addNewNode);
  const resetPipeline = useGraphStore((state) => state.resetPipeline);
  const exportStandaloneScript = useGraphStore((state) => state.exportStandaloneScript);
  const initWebSocket = useGraphStore((state) => state.initWebSocket);

  const getWsBadge = () => {
    switch (wsStatus) {
      case 'connected':
        return (
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-400 text-xs font-medium cursor-default">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Kernel Connected</span>
          </div>
        );
      case 'connecting':
        return (
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-amber-950/80 border border-amber-800 text-amber-400 text-xs font-medium">
            <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
            <span>Connecting...</span>
          </div>
        );
      default:
        return (
          <button
            onClick={() => initWebSocket()}
            title="Click to reconnect"
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-rose-950/80 border border-rose-800 hover:bg-rose-900/80 text-rose-400 text-xs font-medium transition-colors cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Kernel Offline (Click to Reconnect)</span>
          </button>
        );
    }
  };

  return (
    <header className="h-14 px-5 bg-[#0e1422] border-b border-slate-800 flex items-center justify-between z-30 shrink-0 select-none shadow-lg">
      {/* App Branding */}
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-gradient-to-tr from-sky-600 to-indigo-600 rounded-xl shadow-md flex items-center justify-center">
          <Workflow className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-sm font-bold tracking-tight text-white">FlowNotebook</h1>
            <span className="px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 text-[10px] font-semibold uppercase tracking-wider border border-sky-800/80">
              Python
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Node-based Directed Acyclic Graph execution engine & immutable pipeline
          </p>
        </div>
      </div>

      {/* Main Canvas Controls & Actions */}
      <div className="flex items-center space-x-3">
        {/* Run Entire DAG Button */}
        <button
          onClick={runGraph}
          disabled={isGraphRunning || wsStatus !== 'connected'}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-semibold text-xs transition-all shadow-md ${
            isGraphRunning
              ? 'bg-amber-600 text-white cursor-wait animate-pulse'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed'
          }`}
        >
          {isGraphRunning ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Executing DAG...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run Entire DAG</span>
            </>
          )}
        </button>

        {/* Add Node Button */}
        <button
          onClick={addNewNode}
          className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors border border-slate-700 active:scale-95"
        >
          <Plus className="w-3.5 h-3.5 text-sky-400" />
          <span>Add Node</span>
        </button>

        {/* Export Standalone Script */}
        <button
          onClick={exportStandaloneScript}
          className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors border border-slate-700 active:scale-95"
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          <span>Export .py Script</span>
        </button>

        {/* Reset Pipeline */}
        <button
          onClick={resetPipeline}
          title="Reset to 4-Node Seed Pipeline"
          className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800/80 hover:bg-rose-950/60 hover:text-rose-300 text-slate-400 text-xs font-medium rounded-lg transition-colors border border-slate-800 active:scale-95"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Demo</span>
        </button>

        <div className="h-6 w-px bg-slate-800 mx-1" />

        {/* WebSocket Telemetry Status */}
        {getWsBadge()}
      </div>
    </header>
  );
};
