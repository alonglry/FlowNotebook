import React from 'react';
import {
  Play,
  Plus,
  Download,
  RotateCcw,
  Workflow,
  Loader2,
  Save,
  FolderOpen,
  Cloud,
  ChevronLeft,
  Shield
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
  const openStorageModal = useGraphStore((state) => state.openStorageModal);
  const currentUser = useGraphStore((state) => state.currentUser);
  const projectName = useGraphStore((state) => state.projectName);
  const setCurrentView = useGraphStore((state) => state.setCurrentView);

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
      {/* App Branding & Navigation */}
      <div className="flex items-center space-x-2.5">
        <button
          onClick={() => setCurrentView('dashboard')}
          className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
          title="Return to Pipelines Dashboard"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Dashboard</span>
        </button>

        {currentUser?.email?.toLowerCase() === 'alonglry@gmail.com' && (
          <button
            onClick={() => setCurrentView('admin')}
            className="flex items-center space-x-1 px-2.5 py-1.5 bg-amber-950/80 hover:bg-amber-900/80 border border-amber-700 text-amber-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-sm"
            title="Open Admin & Telemetry Portal"
          >
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span>Admin</span>
          </button>
        )}

        <div className="h-4 w-px bg-slate-800" />

        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 bg-gradient-to-tr from-sky-600 to-indigo-600 rounded-lg shadow-md flex items-center justify-center">
            <Workflow className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xs font-bold tracking-tight text-white">{projectName || 'FlowNotebook'}</h1>
              <span className="px-1.5 py-0.2 rounded bg-sky-950 text-sky-400 text-[9px] font-semibold uppercase tracking-wider border border-sky-800/80">
                Python DAG
              </span>
            </div>
            <p className="text-[10px] text-slate-500 truncate max-w-[180px] sm:max-w-xs font-mono">
              Auto-saved
            </p>
          </div>
        </div>
      </div>

      {/* Main Canvas Controls & Actions */}
      <div className="flex items-center space-x-2.5">
        {/* Run Entire DAG Button */}
        <button
          onClick={runGraph}
          disabled={isGraphRunning || wsStatus !== 'connected'}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg font-semibold text-xs transition-all shadow-md cursor-pointer ${
            isGraphRunning
              ? 'bg-amber-600 text-white cursor-wait animate-pulse'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed'
          }`}
        >
          {isGraphRunning ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Running...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run DAG</span>
            </>
          )}
        </button>

        {/* Add Node Button */}
        <button
          onClick={addNewNode}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors border border-slate-700 active:scale-95 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-sky-400" />
          <span>Add Node</span>
        </button>

        <div className="h-5 w-px bg-slate-800 mx-0.5" />

        {/* Save Pipeline Button */}
        <button
          onClick={() => openStorageModal('save')}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors border border-slate-700 active:scale-95 cursor-pointer"
          title="Save to Google Drive or Local Storage"
        >
          <Save className="w-3.5 h-3.5 text-sky-400" />
          <span>Save</span>
        </button>

        {/* Open Pipeline Button */}
        <button
          onClick={() => openStorageModal('open')}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors border border-slate-700 active:scale-95 cursor-pointer"
          title="Open from Google Drive or Local File"
        >
          <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
          <span>Open</span>
        </button>

        {/* Export Standalone Script */}
        <button
          onClick={exportStandaloneScript}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors border border-slate-700 active:scale-95 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          <span>Export .py</span>
        </button>

        {/* Reset Pipeline */}
        <button
          onClick={resetPipeline}
          title="Reset to 4-Node Seed Pipeline"
          className="p-1.5 bg-slate-800/80 hover:bg-rose-950/60 hover:text-rose-300 text-slate-400 text-xs font-medium rounded-lg transition-colors border border-slate-800 active:scale-95 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <div className="h-5 w-px bg-slate-800 mx-0.5" />

        {/* Google User Profile or Connect Cloud Button */}
        {currentUser ? (
          <button
            onClick={() => openStorageModal('save')}
            className="flex items-center space-x-2 px-2 py-1 bg-slate-900 border border-slate-700 hover:border-sky-500 rounded-full transition-colors cursor-pointer"
            title={`Connected to Google Drive as ${currentUser.name}`}
          >
            {currentUser.avatarUrl ? (
              <img src={currentUser.avatarUrl} alt="" className="w-5 h-5 rounded-full" />
            ) : (
              <Cloud className="w-4 h-4 text-sky-400" />
            )}
            <span className="text-xs text-slate-200 font-medium max-w-[90px] truncate">
              {currentUser.name.split(' ')[0]}
            </span>
          </button>
        ) : (
          <button
            onClick={() => openStorageModal('save')}
            className="flex items-center space-x-1.5 px-2.5 py-1 bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs rounded-lg transition-colors cursor-pointer"
            title="Connect Google Drive Cloud Storage"
          >
            <Cloud className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden md:inline">Drive Sync</span>
          </button>
        )}

        {/* WebSocket Telemetry Status */}
        {getWsBadge()}
      </div>
    </header>
  );
};
