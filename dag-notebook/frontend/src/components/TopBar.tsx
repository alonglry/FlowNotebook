import React from 'react';
import {
  Play,
  Plus,
  Download,
  Workflow,
  Loader2,
  Save,
  Cloud,
  ChevronLeft,
  Shield
} from 'lucide-react';
import { useGraphStore } from '../store/useGraphStore';
import { ThemeToggle } from './ThemeToggle';

export const TopBar: React.FC = () => {
  const theme = useGraphStore((state) => state.theme);
  const wsStatus = useGraphStore((state) => state.wsStatus);
  const isGraphRunning = useGraphStore((state) => state.isGraphRunning);
  const runGraph = useGraphStore((state) => state.runGraph);
  const addNewNode = useGraphStore((state) => state.addNewNode);
  const exportStandaloneScript = useGraphStore((state) => state.exportStandaloneScript);
  const openStorageModal = useGraphStore((state) => state.openStorageModal);
  const currentUser = useGraphStore((state) => state.currentUser);
  const projectName = useGraphStore((state) => state.projectName);
  const setCurrentView = useGraphStore((state) => state.setCurrentView);

  const isDark = theme === 'dark';

  return (
    <header className={`h-14 px-5 flex items-center justify-between z-30 shrink-0 select-none transition-colors duration-200 ${
      isDark
        ? 'bg-[#0e1422] border-b border-slate-800 shadow-lg text-slate-100'
        : 'bg-white/95 border-b border-slate-200 backdrop-blur-md shadow-xs text-slate-800'
    }`}>
      {/* App Branding & Navigation */}
      <div className="flex items-center space-x-2.5">
        <button
          onClick={() => setCurrentView('dashboard')}
          className={`flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
            isDark
              ? 'bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white'
              : 'bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 hover:text-slate-900'
          }`}
          title="Return to Pipelines Dashboard"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Dashboard</span>
        </button>

        {['alonglry@gmail.com', 'flownotebook.support@gmail.com'].includes(currentUser?.email?.toLowerCase() || '') && (
          <button

            onClick={() => setCurrentView('admin')}
            className={`flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-sm ${
              isDark
                ? 'bg-amber-950/80 hover:bg-amber-900/80 border border-amber-700 text-amber-300'
                : 'bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800'
            }`}
            title="Open Admin & Telemetry Portal"
          >
            <Shield className="w-3.5 h-3.5 text-amber-500" />
            <span>Admin</span>
          </button>
        )}

        <div className={`h-4 w-px ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 bg-gradient-to-tr from-sky-600 to-indigo-600 rounded-lg shadow-md flex items-center justify-center">
            <Workflow className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className={`text-xs font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {projectName || 'FlowNotebook'}
              </h1>
            </div>
            <p className={`text-[10px] truncate max-w-[180px] sm:max-w-xs font-mono ${
              isDark ? 'text-slate-500' : 'text-slate-400'
            }`}>
              Auto-saved
            </p>
          </div>
        </div>
      </div>

      {/* Main Canvas Controls & Actions */}
      <div className="flex items-center space-x-2">
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
          className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border active:scale-95 cursor-pointer ${
            isDark
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-xs'
          }`}
        >
          <Plus className="w-3.5 h-3.5 text-sky-500" />
          <span>Add Node</span>
        </button>

        <div className={`h-5 w-px mx-0.5 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

        {/* Save Pipeline Button */}
        <button
          onClick={() => openStorageModal('save')}
          className={`flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors border active:scale-95 cursor-pointer ${
            isDark
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-xs'
          }`}
          title="Save to Local (.flownb) or Google Drive"
        >
          <Save className="w-3.5 h-3.5 text-sky-500" />
          <span>Save</span>
        </button>

        {/* Export Standalone Script */}
        <button
          onClick={exportStandaloneScript}
          className={`flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors border active:scale-95 cursor-pointer ${
            isDark
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-xs'
          }`}
        >
          <Download className="w-3.5 h-3.5 text-emerald-500" />
          <span>Export .py</span>
        </button>

        <div className={`h-5 w-px mx-0.5 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

        {/* Theme Toggle Button */}
        <ThemeToggle />

        <div className={`h-5 w-px mx-0.5 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

        {/* Google User Profile or Connect Cloud Button */}
        {currentUser ? (
          <button
            onClick={() => openStorageModal('save')}
            className={`flex items-center space-x-2 px-2 py-1 rounded-full transition-colors cursor-pointer border ${
              isDark
                ? 'bg-slate-900 border-slate-700 hover:border-sky-500 text-slate-200'
                : 'bg-white border-slate-200 hover:border-sky-500 text-slate-700 shadow-xs'
            }`}
            title={`Connected to Google Drive as ${currentUser.name}`}
          >
            {currentUser.avatarUrl ? (
              <img src={currentUser.avatarUrl} alt="" className="w-5 h-5 rounded-full" />
            ) : (
              <Cloud className="w-4 h-4 text-sky-500" />
            )}
            <span className="text-xs font-medium max-w-[90px] truncate">
              {currentUser.name.split(' ')[0]}
            </span>
          </button>
        ) : (
          <button
            onClick={() => openStorageModal('save')}
            className={`flex items-center space-x-1.5 px-2.5 py-1 text-xs rounded-lg transition-colors cursor-pointer border ${
              isDark
                ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700 text-slate-300'
                : 'bg-slate-100 border-slate-200 hover:border-slate-300 text-slate-700'
            }`}
            title="Connect Google Drive Cloud Storage"
          >
            <Cloud className="w-3.5 h-3.5 text-sky-500" />
            <span className="hidden md:inline">Drive Sync</span>
          </button>
        )}
      </div>
    </header>
  );
};
