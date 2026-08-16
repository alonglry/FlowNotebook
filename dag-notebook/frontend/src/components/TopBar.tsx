import React, { useState, useEffect, useCallback } from 'react';
import {
  Play,
  Plus,
  Download,
  Workflow,
  Loader2,
  Save,
  Cloud,
  ChevronLeft,
  Shield,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useGraphStore } from '../store/useGraphStore';
import { ThemeToggle } from './ThemeToggle';
import { isStandalone } from '../services/appConfig';

export const TopBar: React.FC = () => {
  const theme = useGraphStore((state) => state.theme);
  const wsStatus = useGraphStore((state) => state.wsStatus);
  const isGraphRunning = useGraphStore((state) => state.isGraphRunning);
  const runGraph = useGraphStore((state) => state.runGraph);
  const addNewNode = useGraphStore((state) => state.addNewNode);
  const exportStandaloneScript = useGraphStore((state) => state.exportStandaloneScript);
  const openStorageModal = useGraphStore((state) => state.openStorageModal);
  const saveActivePipelineDirectly = useGraphStore((state) => state.saveActivePipelineDirectly);
  const currentUser = useGraphStore((state) => state.currentUser);
  const projectName = useGraphStore((state) => state.projectName);
  const setCurrentView = useGraphStore((state) => state.setCurrentView);

  const [saveStatus, setSaveStatus] = useState<{
    type: 'saving' | 'success' | 'error';
    message: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    setSaveStatus({ type: 'saving', message: 'Saving pipeline to workspace...' });
    try {
      const res = await saveActivePipelineDirectly();
      if (res.success) {
        setSaveStatus({ type: 'success', message: res.message || 'Saved successfully!' });
        const now = new Date();
        setLastSavedTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      } else {
        setSaveStatus({ type: 'error', message: res.message || 'Save failed.' });
      }
    } catch (err: any) {
      setSaveStatus({ type: 'error', message: err?.message || 'Save failed.' });
    } finally {
      setIsSaving(false);
      setTimeout(() => {
        setSaveStatus((prev) => (prev?.type === 'saving' ? prev : null));
      }, 3500);
    }
  }, [isSaving, saveActivePipelineDirectly]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

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

        {!isStandalone && ['alonglry@gmail.com', 'flownotebook.support@gmail.com'].includes(currentUser?.email?.toLowerCase() || '') && (
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
            <p className={`text-[10px] truncate max-w-[180px] sm:max-w-xs font-mono flex items-center space-x-1 ${
              isDark ? 'text-emerald-400/90' : 'text-emerald-600'
            }`}>
              <span>●</span>
              <span>{lastSavedTime ? `Saved at ${lastSavedTime}` : 'Saved to disk'}</span>
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

        {/* Direct Save Pipeline Button */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors border active:scale-95 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
            isDark
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-xs'
          }`}
          title="Save pipeline directly to workspace (Ctrl+S / Cmd+S)"
        >
          {isSaving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-500" />
          ) : (
            <Save className="w-3.5 h-3.5 text-sky-500" />
          )}
          <span>{isSaving ? 'Saving...' : 'Save'}</span>
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

      {/* Floating Save Status Toast Notification */}
      {saveStatus && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300">
          <div className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-medium border backdrop-blur-md transition-all ${
            saveStatus.type === 'saving'
              ? (isDark ? 'bg-slate-900/95 text-sky-400 border-sky-500/30 shadow-sky-950/40' : 'bg-white/95 text-sky-700 border-sky-200 shadow-sky-100')
              : saveStatus.type === 'success'
              ? (isDark ? 'bg-emerald-950/95 text-emerald-300 border-emerald-500/40 shadow-emerald-950/50' : 'bg-emerald-50/95 text-emerald-800 border-emerald-200 shadow-emerald-100')
              : (isDark ? 'bg-rose-950/95 text-rose-300 border-rose-500/40 shadow-rose-950/50' : 'bg-rose-50/95 text-rose-800 border-rose-200 shadow-rose-100')
          }`}>
            {saveStatus.type === 'saving' && <Loader2 className="w-4 h-4 animate-spin text-sky-400" />}
            {saveStatus.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            {saveStatus.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400" />}
            <span className="font-semibold">{saveStatus.message}</span>
          </div>
        </div>
      )}
    </header>
  );
};
