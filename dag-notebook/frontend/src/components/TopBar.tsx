import React from 'react';
import {
  Play,
  Plus,
  Download,
  Workflow,
  Loader2,
  Save,
  FolderOpen,
  Cloud
} from 'lucide-react';
import { useGraphStore } from '../store/useGraphStore';

export const TopBar: React.FC = () => {
  const wsStatus = useGraphStore((state) => state.wsStatus);
  const isGraphRunning = useGraphStore((state) => state.isGraphRunning);
  const runGraph = useGraphStore((state) => state.runGraph);
  const addNewNode = useGraphStore((state) => state.addNewNode);
  const exportStandaloneScript = useGraphStore((state) => state.exportStandaloneScript);
  const openStorageModal = useGraphStore((state) => state.openStorageModal);
  const currentUser = useGraphStore((state) => state.currentUser);
  const projectName = useGraphStore((state) => state.projectName);

  return (
    <header className="h-14 px-5 bg-[#0e1422] border-b border-slate-800 flex items-center justify-between z-30 shrink-0 select-none shadow-lg">
      {/* App Branding */}
      <div className="flex items-center space-x-2.5">
        <div className="p-1.5 bg-gradient-to-tr from-sky-600 to-indigo-600 rounded-lg shadow-md flex items-center justify-center">
          <Workflow className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xs font-bold tracking-tight text-white">{projectName || 'FlowNotebook'}</h1>
          </div>
          <p className="text-[10px] text-slate-500 truncate max-w-[180px] sm:max-w-xs font-mono">
            Direct Acyclic Graph Workspace
          </p>
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
      </div>
    </header>
  );
};
