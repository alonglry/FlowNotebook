import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Workflow,
  Plus,
  Search,
  Cloud,
  LogOut,
  Copy,
  Trash2,
  TrendingUp,
  BrainCircuit,
  Database,
  Layers,
  ArrowRight,
  X,
  Clock,
  ChevronLeft,
  Shield,
  HardDrive,
  RefreshCw,
  Upload,
  Loader2,
  Sparkles,
  FileCode2,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { useGraphStore, type PipelineItem } from '../store/useGraphStore';
import { storageManager, type ProjectMetadata } from '../services/storage';
import { ThemeToggle } from './ThemeToggle';
import { LegalModal, type LegalTab } from './LegalModal';
import { getAppCapabilities, isStandalone } from '../services/appConfig';

type SourceFilter = 'all' | 'custom' | 'drive' | 'preset';
type CategoryFilter = 'all' | 'quant' | 'ml' | 'etl' | 'custom';

export const Dashboard: React.FC = () => {
  const theme = useGraphStore((state) => state.theme);
  const isDark = theme === 'dark';

  const setCurrentView = useGraphStore((state) => state.setCurrentView);
  const storePipelines = useGraphStore((state) => state.pipelines);
  const createPipeline = useGraphStore((state) => state.createPipeline);
  const openPipeline = useGraphStore((state) => state.openPipeline);
  const loadProjectData = useGraphStore((state) => state.loadProjectData);
  const deletePipeline = useGraphStore((state) => state.deletePipeline);
  const duplicatePipeline = useGraphStore((state) => state.duplicatePipeline);
  const currentUser = useGraphStore((state) => state.currentUser);
  const setCurrentUser = useGraphStore((state) => state.setCurrentUser);

  const capabilities = useMemo(() => getAppCapabilities(currentUser), [currentUser]);
  const canCreatePipeline = capabilities.canCreatePipeline;
  const canModifyPipeline = capabilities.canModifyPipeline;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [selectedSource, setSelectedSource] = useState<SourceFilter>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [authPromptAction, setAuthPromptAction] = useState<'create' | 'open' | 'save' | 'import' | 'duplicate' | null>(null);
  const [newPipelineName, setNewPipelineName] = useState('');
  const [newPipelineCategory, setNewPipelineCategory] = useState<'quant' | 'ml' | 'etl' | 'custom'>('custom');
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<LegalTab>('terms');

  // Google Drive Modal & Delete Confirmation states
  const [isDrivePickerOpen, setIsDrivePickerOpen] = useState(false);
  const [driveSearchQuery, setDriveSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<PipelineItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Storage synced state
  const [driveProjects, setDriveProjects] = useState<ProjectMetadata[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const fetchDiskPipelines = useGraphStore((state) => state.fetchDiskPipelines);

  useEffect(() => {
    fetchDiskPipelines();

    const handleFocus = () => {
      fetchDiskPipelines();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    // Periodic sync while on dashboard to detect external additions or deletions on disk
    const interval = setInterval(() => {
      fetchDiskPipelines();
    }, 2000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      clearInterval(interval);
    };
  }, [fetchDiskPipelines]);

  const isGoogleAuth = storageManager.googleDriveProvider.isAuthenticated;
  const hasDriveAccess = storageManager.googleDriveProvider.hasDriveAccess;

  // Sync projects from Google Drive
  const syncStoragePipelines = useCallback(async () => {
    setIsSyncing(true);
    try {
      if (storageManager.googleDriveProvider.isAuthenticated && storageManager.googleDriveProvider.hasDriveAccess) {
        const drives = await storageManager.googleDriveProvider.listProjects();
        setDriveProjects(drives);
      } else {
        setDriveProjects([]);
      }
    } catch (err) {
      console.error('[Dashboard] Sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    syncStoragePipelines();
  }, [syncStoragePipelines, currentUser, isGoogleAuth, hasDriveAccess]);

  // Combine store pipelines and Google Drive files into unified list
  const combinedPipelines = useMemo(() => {
    const items: PipelineItem[] = [];
    const seenNames = new Set<string>();

    // 1. Add store pipelines (presets, recently created, or in-memory)
    for (const p of storePipelines) {
      items.push({
        ...p,
        source: p.source || (p.id.startsWith('pipe_') ? 'custom' : 'preset'),
      });
      seenNames.add(p.name.toLowerCase());
    }

    // 2. Add Google Drive pipelines if not already in store
    for (const dp of driveProjects) {
      const driveKey = `drive_${dp.id || dp.name}`;
      const existingInItems = items.find(
        (i) => i.fileId === dp.id || (i.source === 'drive' && i.name.toLowerCase() === dp.name.toLowerCase())
      );
      if (!existingInItems) {
        items.push({
          id: driveKey,
          name: dp.name,
          category: 'custom',
          description: `Stored in Google Drive /FlowNotebook/ (${dp.nodeCount || 0} nodes)`,
          updatedAt: dp.updatedAt,
          nodeCount: dp.nodeCount || 0,
          edgeCount: dp.edgeCount || 0,
          nodes: [],
          edges: [],
          source: 'drive',
          fileId: dp.id,
        });
      }
    }

    return items;
  }, [storePipelines, driveProjects]);

  // Filtered by Search, Category, and Source
  const filteredPipelines = useMemo(() => {
    return combinedPipelines.filter((p) => {
      const query = searchQuery.trim().toLowerCase();
      const name = (p.name || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      const source = (p.source || '').toLowerCase();
      const matchesSearch = !query || name.includes(query) || desc.includes(query) || source.includes(query);

      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory || (!p.category && selectedCategory === 'custom');

      const matchesSource =
        selectedSource === 'all' ||
        (selectedSource === 'custom' && (p.source === 'custom' || p.source === 'local')) ||
        (selectedSource === 'drive' && p.source === 'drive') ||
        (selectedSource === 'preset' && (p.source === 'preset' || !p.source));

      return matchesSearch && matchesCategory && matchesSource;
    });
  }, [combinedPipelines, searchQuery, selectedCategory, selectedSource]);

  // Counts for Source filter tabs
  const sourceCounts = useMemo(() => {
    return {
      all: combinedPipelines.length,
      custom: combinedPipelines.filter((p) => p.source === 'custom' || p.source === 'local').length,
      drive: combinedPipelines.filter((p) => p.source === 'drive').length,
      preset: combinedPipelines.filter((p) => p.source === 'preset').length,
    };
  }, [combinedPipelines]);

  const handleGoogleSignIn = async () => {
    const user = await storageManager.googleDriveProvider.signIn();
    if (user) {
      setCurrentUser(user);
      await syncStoragePipelines();
    }
  };

  const handleConnectDrive = async () => {
    const granted = await storageManager.googleDriveProvider.requestDriveAccess();
    if (granted) {
      if (storageManager.googleDriveProvider.user) {
        setCurrentUser(storageManager.googleDriveProvider.user);
      }
      await syncStoragePipelines();
    }
  };

  const handleGoogleSignOut = async () => {
    await storageManager.googleDriveProvider.signOut();
    setCurrentUser(null);
    setDriveProjects([]);
  };

  const handleCreateClick = () => {
    if (!canCreatePipeline) {
      setAuthPromptAction('create');
      return;
    }
    setIsCreateModalOpen(true);
  };

  const isDuplicateName = useMemo(() => {
    const trimmed = newPipelineName.trim().toLowerCase();
    if (!trimmed) return false;
    return combinedPipelines.some((p) => (p.name || '').trim().toLowerCase() === trimmed);
  }, [newPipelineName, combinedPipelines]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newPipelineName.trim();
    if (!trimmed || isDuplicateName) return;

    createPipeline(trimmed, newPipelineCategory);
    setIsCreateModalOpen(false);
    setNewPipelineName('');
  };

  const handleOpenPipelineItem = async (pipeline: PipelineItem) => {
    if (!isStandalone && !currentUser) {
      setAuthPromptAction('open');
      return;
    }

    setOpeningId(pipeline.id);

    try {
      // 1. If it's a Google Drive project and not yet loaded in memory
      if (pipeline.source === 'drive' && pipeline.fileId && (!pipeline.nodes || pipeline.nodes.length === 0)) {
        const driveData = await storageManager.googleDriveProvider.loadProject(pipeline.fileId);
        if (driveData) {
          loadProjectData({
            ...driveData,
            source: 'drive',
            fileId: pipeline.fileId,
          });
          return;
        }
      }

      // 2. In-memory / Preset / Local pipeline
      openPipeline(pipeline.id);
    } catch (err) {
      console.error('[Dashboard] Failed to open pipeline:', err);
      alert('Failed to open pipeline.');
    } finally {
      setOpeningId(null);
    }
  };

  const handleDeletePipelineItem = (pipeline: PipelineItem) => {
    if (!canModifyPipeline) {
      setAuthPromptAction('create');
      return;
    }
    setDeleteTarget(pipeline);
    setDeleteError(null);
  };

  const executeDeletePipeline = async (target: PipelineItem) => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      if (target.source === 'drive' && target.fileId) {
        const res = await storageManager.googleDriveProvider.deleteProject(target.fileId);
        if (!res.success) {
          console.warn('[Dashboard] Could not delete file from Google Drive:', res.message);
        }
      }

      deletePipeline(target.id);

      if (target.source === 'drive') {
        await syncStoragePipelines();
      }

      setDeleteTarget(null);
    } catch (err: any) {
      console.error('[Dashboard] Failed to delete pipeline:', err);
      setDeleteError(err.message || 'Failed to delete pipeline.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenFromDrive = async () => {
    if (!currentUser) {
      await handleGoogleSignIn();
      if (!storageManager.googleDriveProvider.user) return;
    }
    if (!hasDriveAccess) {
      const granted = await storageManager.googleDriveProvider.requestDriveAccess();
      if (granted) {
        if (storageManager.googleDriveProvider.user) {
          setCurrentUser(storageManager.googleDriveProvider.user);
        }
        await syncStoragePipelines();
        setIsDrivePickerOpen(true);
      }
      return;
    }
    await syncStoragePipelines();
    setIsDrivePickerOpen(true);
  };

  const handleDuplicatePipelineItem = async (pipeline: PipelineItem) => {
    if (!canCreatePipeline) {
      setAuthPromptAction('duplicate');
      return;
    }
    if (pipeline.nodes && pipeline.nodes.length > 0) {
      duplicatePipeline(pipeline.id);
    } else if (pipeline.source === 'drive' && pipeline.fileId) {
      const driveData = await storageManager.googleDriveProvider.loadProject(pipeline.fileId);
      if (driveData) {
        loadProjectData({
          ...driveData,
          name: `${driveData.name} (Copy)`,
          source: 'drive',
        });
      }
    }
  };

  // Drag & drop file handler
  const handleDropFile = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);

    if (!canCreatePipeline) {
      setAuthPromptAction('import');
      return;
    }

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const fullFilePath = (file as any).path || file.name;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (parsed.nodes && parsed.edges) {
          loadProjectData({
            ...parsed,
            name: parsed.name || file.name.replace(/\.[^/.]+$/, ''),
            source: 'custom',
            filePath: parsed.filePath || fullFilePath,
          });
        } else {
          alert('Invalid FlowNotebook pipeline file format.');
        }
      } catch (err) {
        alert('Could not parse pipeline file.');
      }
    };
    reader.readAsText(file);
  };

  const getPipelineLocation = (pipeline: PipelineItem): string | null => {
    if (pipeline.source === 'drive') {
      return `Google Drive/FlowNotebook/${pipeline.name}.flownpy`;
    }
    return `dag-notebook/backend/.flownotebook_workspaces/${pipeline.id}/pipeline.flownpy`;
  };

  const getSourceBadge = (source?: PipelineItem['source']) => {
    switch (source) {
      case 'drive':
        return (
          <span
            className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
              isDark
                ? 'bg-sky-950/80 border-sky-800/80 text-sky-400'
                : 'bg-sky-50 border-sky-200 text-sky-700'
            }`}
            title="Stored in Google Drive"
          >
            <Cloud className="w-3 h-3 text-sky-500" />
            <span>Google Drive</span>
          </span>
        );
      case 'custom':
        return (
          <span
            className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
              isDark
                ? 'bg-emerald-950/80 border-emerald-800/80 text-emerald-400'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}
            title="Local File"
          >
            <HardDrive className="w-3 h-3 text-emerald-500" />
            <span>Local File</span>
          </span>
        );
      default:
        return (
          <span
            className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
              isDark
                ? 'bg-indigo-950/80 border-indigo-800/80 text-indigo-400'
                : 'bg-indigo-50 border-indigo-200 text-indigo-700'
            }`}
            title="Pre-seeded Template"
          >
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span>Preset Template</span>
          </span>
        );
    }
  };

  const getCategoryIcon = (cat: PipelineItem['category']) => {
    switch (cat) {
      case 'quant':
        return <TrendingUp className="w-4 h-4 text-emerald-500" />;
      case 'ml':
        return <BrainCircuit className="w-4 h-4 text-purple-500" />;
      case 'etl':
        return <Database className="w-4 h-4 text-amber-500" />;
      default:
        return <Layers className="w-4 h-4 text-sky-500" />;
    }
  };

  const getCategoryBadge = (cat: PipelineItem['category']) => {
    switch (cat) {
      case 'quant':
        return (
          <span
            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
              isDark
                ? 'bg-emerald-950/80 border-emerald-800/80 text-emerald-400'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}
          >
            Quantitative
          </span>
        );
      case 'ml':
        return (
          <span
            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
              isDark
                ? 'bg-purple-950/80 border-purple-800/80 text-purple-400'
                : 'bg-purple-50 border-purple-200 text-purple-700'
            }`}
          >
            Machine Learning
          </span>
        );
      case 'etl':
        return (
          <span
            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
              isDark
                ? 'bg-amber-950/80 border-amber-800/80 text-amber-400'
                : 'bg-amber-50 border-amber-200 text-amber-700'
            }`}
          >
            Data ETL
          </span>
        );
      default:
        return (
          <span
            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
              isDark
                ? 'bg-sky-950/80 border-sky-800/80 text-sky-400'
                : 'bg-sky-50 border-sky-200 text-sky-700'
            }`}
          >
            Custom
          </span>
        );
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingFile(true);
      }}
      onDragLeave={() => setIsDraggingFile(false)}
      onDrop={handleDropFile}
      className={`min-h-screen font-sans flex flex-col transition-colors duration-200 relative ${
        isDark ? 'bg-[#070b14] text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Drag & Drop Overlay */}
      {isDraggingFile && (
        <div className="fixed inset-0 z-50 bg-sky-950/80 backdrop-blur-sm flex flex-col items-center justify-center border-4 border-dashed border-sky-400 m-4 rounded-3xl animate-in fade-in duration-150">
          <Upload className="w-16 h-16 text-sky-400 animate-bounce mb-3" />
          <h2 className="text-xl font-bold text-white">Drop .flownb file here</h2>
          <p className="text-xs text-sky-300 mt-1">Directly import pipeline onto canvas</p>
        </div>
      )}

      {/* Top Navigation */}
      <header
        className={`h-16 px-6 border-b flex items-center justify-between z-30 shrink-0 select-none transition-colors duration-200 ${
          isDark ? 'bg-[#0c1220] border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}
      >
        <div className="flex items-center space-x-4">
          {!currentUser && !isStandalone && (
            <>
              <button
                onClick={() => setCurrentView('landing')}
                className={`flex items-center space-x-1.5 text-xs transition-colors cursor-pointer ${
                  isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Home</span>
              </button>

              <div className={`h-5 w-px ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
            </>
          )}

          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-gradient-to-tr from-sky-500 to-indigo-600 rounded-lg shadow-sm">
              <Workflow className="w-4 h-4 text-white" />
            </div>
            <span className={`text-sm font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              FlowNotebook Dashboard
            </span>
          </div>
        </div>

        {/* User Profile / Google Auth & Admin */}
        <div className="flex items-center space-x-3">
          {/* Theme Toggle Button */}
          <ThemeToggle />

          {/* Sync / Refresh Button (Hosted Platform only) */}
          {capabilities.allowSync && (
            <button
              onClick={syncStoragePipelines}
              disabled={isSyncing}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                isDark
                  ? 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-xs'
              }`}
              title="Refresh local and Google Drive pipelines"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-sky-500 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sync</span>
            </button>
          )}

          {/* Admin Portal Button (Hosted Platform only) */}
          {capabilities.allowAdmin &&
            ['alonglry@gmail.com', 'flownotebook.support@gmail.com'].includes(
              currentUser?.email?.toLowerCase() || ''
            ) && (
              <button
                onClick={() => setCurrentView('admin')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  isDark
                    ? 'bg-amber-950/80 border-amber-700/80 text-amber-300 hover:bg-amber-900/80 shadow-md'
                    : 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100 shadow-xs'
                }`}
                title="Open Admin & Telemetry Portal"
              >
                <Shield className="w-3.5 h-3.5 text-amber-500" />
                <span>Admin</span>
              </button>
            )}

          {/* User Auth & Login (Hosted Platform only) */}
          {capabilities.allowAuth && (
            currentUser ? (
              <div
                className={`flex items-center space-x-3 border rounded-xl px-3 py-1.5 ${
                  isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                {currentUser.avatarUrl ? (
                  <img src={currentUser.avatarUrl} alt="" className="w-6 h-6 rounded-full" />
                ) : (
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isDark ? 'bg-sky-950 text-sky-400' : 'bg-sky-50 text-sky-700'
                    }`}
                  >
                    {currentUser.name.charAt(0)}
                  </div>
                )}
                <div className="text-left hidden sm:block">
                  <div className={`text-xs font-semibold leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {currentUser.name}
                  </div>
                  <div className={`text-[10px] leading-tight ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {currentUser.email}
                  </div>
                </div>
                <div className={`h-4 w-px ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                <button
                  onClick={handleGoogleSignOut}
                  title="Sign Out"
                  className="p-1 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleGoogleSignIn}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-xs'
                }`}
              >
                <Cloud className="w-3.5 h-3.5 text-sky-500" />
                <span>Sign In with Google</span>
              </button>
            )
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-8">
        {/* Demo Mode Notice Banner for unauthenticated users in hosted platform */}
        {!currentUser && !isStandalone && (
          <div
            className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors ${
              isDark
                ? 'bg-gradient-to-r from-indigo-950/40 via-sky-950/20 to-slate-900 border-indigo-800/50 text-slate-200 shadow-lg shadow-indigo-950/20'
                : 'bg-gradient-to-r from-sky-50 via-indigo-50/50 to-white border-sky-200 text-slate-800 shadow-xs'
            }`}
          >
            <div className="flex items-start sm:items-center space-x-3.5">
              <div className={`p-2.5 rounded-xl border shrink-0 ${
                isDark ? 'bg-indigo-900/40 border-indigo-700/50 text-indigo-400' : 'bg-sky-100 border-sky-200 text-sky-600'
              }`}>
                <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className={`text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                    isDark ? 'bg-indigo-900/60 text-indigo-300 border border-indigo-700/50' : 'bg-sky-100 text-sky-700 border border-sky-300'
                  }`}>
                    Demo Mode
                  </span>
                  <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Guest Preview Workspace
                  </span>
                </div>
                <p className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  You are previewing sample pipelines in read-only demo mode. Sign in with Google to create, open, edit, and save your own workflows.
                </p>
              </div>
            </div>
            <button
              onClick={handleGoogleSignIn}
              className="px-5 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-sky-500/25 transition-all transform active:scale-95 cursor-pointer shrink-0 flex items-center space-x-2"
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>Sign In with Google</span>
            </button>
          </div>
        )}

        {/* Banner */}
        <div
          className={`p-6 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors ${
            isDark
              ? 'bg-gradient-to-r from-slate-900 via-[#0e1628] to-[#0c1324] border-slate-800'
              : 'bg-gradient-to-r from-sky-50/70 via-indigo-50/40 to-white border-slate-200 shadow-xs'
          }`}
        >
          <div className="space-y-1">
            <h1 className={`text-xl font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Your Python Pipelines
            </h1>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {isStandalone
                ? 'Local Python workspace executing DAG pipelines on your local kernel.'
                : 'Unified visual workspace listing local disk files and cloud Google Drive pipelines.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {capabilities.allowGoogleDrive && (
              <div
                className={`px-3 py-1.5 rounded-lg border text-xs flex items-center space-x-1.5 ${
                  isDark
                    ? 'bg-slate-950/80 border-slate-800 text-slate-300'
                    : 'bg-white border-slate-200 text-slate-700 shadow-xs'
                }`}
              >
                <Cloud className="w-3.5 h-3.5 text-sky-500" />
                <span>
                  <strong className={isDark ? 'text-sky-400' : 'text-sky-600'}>{sourceCounts.drive}</strong> Cloud Drive
                </span>
              </div>
            )}

            <div
              className={`px-3 py-1.5 rounded-lg border text-xs flex items-center space-x-1.5 ${
                isDark
                  ? 'bg-slate-950/80 border-slate-800 text-slate-300'
                  : 'bg-white border-slate-200 text-slate-700 shadow-xs'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>
                <strong className={isDark ? 'text-indigo-400' : 'text-indigo-600'}>{sourceCounts.preset}</strong> Templates
              </span>
            </div>

            <div
              className={`px-3 py-1.5 rounded-lg border text-xs flex items-center space-x-1.5 ${
                isDark
                  ? 'bg-slate-950/80 border-slate-800 text-slate-300'
                  : 'bg-white border-slate-200 text-slate-700 shadow-xs'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Kernel Ready</span>
            </div>
          </div>
        </div>

        {/* Google Drive Connect Callout if not connected (Hosted Platform only) */}
        {capabilities.allowGoogleDrive && currentUser && !hasDriveAccess && (
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between gap-4 text-xs transition-colors ${
              isDark
                ? 'bg-sky-950/30 border-sky-800/60 text-sky-200'
                : 'bg-sky-50/80 border-sky-200 text-sky-900'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-sky-500/20 rounded-xl text-sky-400">
                <Cloud className="w-5 h-5 text-sky-500" />
              </div>
              <div>
                <div className="font-bold">Connect Google Drive</div>
                <p className={`text-[11px] ${isDark ? 'text-sky-300/80' : 'text-sky-700'}`}>
                  Grant access to display and sync `.flownb` pipelines directly from your `/FlowNotebook/` folder.
                </p>
              </div>
            </div>
            <button
              onClick={handleConnectDrive}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold shadow-md transition-colors cursor-pointer shrink-0"
            >
              Connect Drive
            </button>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="space-y-3">
          {/* Source Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div
              className={`flex flex-wrap rounded-xl p-1 border text-xs ${
                isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-100 border-slate-200'
              }`}
            >
              <button
                onClick={() => setSelectedSource('all')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center space-x-1.5 ${
                  selectedSource === 'all'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : isDark
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>All Pipelines</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    selectedSource === 'all'
                      ? 'bg-white/20 text-white'
                      : isDark
                      ? 'bg-slate-800 text-slate-400'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {sourceCounts.all}
                </span>
              </button>

              <button
                onClick={() => setSelectedSource('custom')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center space-x-1.5 ${
                  selectedSource === 'custom'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : isDark
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>My Pipelines</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    selectedSource === 'custom'
                      ? 'bg-white/20 text-white'
                      : isDark
                      ? 'bg-slate-800 text-slate-400'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {sourceCounts.custom}
                </span>
              </button>

              {capabilities.allowGoogleDrive && (
                <button
                  onClick={() => setSelectedSource('drive')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center space-x-1.5 ${
                    selectedSource === 'drive'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : isDark
                      ? 'text-slate-400 hover:text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Cloud className="w-3.5 h-3.5" />
                  <span>Google Drive</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      selectedSource === 'drive'
                        ? 'bg-white/20 text-white'
                        : isDark
                        ? 'bg-slate-800 text-slate-400'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {sourceCounts.drive}
                  </span>
                </button>
              )}

              <button
                onClick={() => setSelectedSource('preset')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center space-x-1.5 ${
                  selectedSource === 'preset'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : isDark
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Templates</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    selectedSource === 'preset'
                      ? 'bg-white/20 text-white'
                      : isDark
                      ? 'bg-slate-800 text-slate-400'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {sourceCounts.preset}
                </span>
              </button>
            </div>

            {/* Search Box */}
            <div className="relative max-w-xs w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, tags, or description..."
                className={`w-full pl-9 pr-3.5 py-1.5 rounded-xl text-xs focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-all border ${
                  isDark
                    ? 'bg-slate-900/90 border-slate-800 text-white placeholder-slate-500'
                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 shadow-xs'
                }`}
              />
            </div>
          </div>

          {/* Secondary Category Filters */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
            <span className={`text-[11px] font-semibold uppercase tracking-wider mr-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              Category:
            </span>
            {(['all', 'quant', 'ml', 'etl', 'custom'] as CategoryFilter[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer text-[11px] ${
                  selectedCategory === cat
                    ? isDark
                      ? 'bg-slate-800 text-white font-bold'
                      : 'bg-slate-200 text-slate-900 font-bold'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat === 'all'
                  ? 'All Categories'
                  : cat === 'quant'
                  ? 'Quantitative'
                  : cat === 'ml'
                  ? 'Machine Learning'
                  : cat === 'etl'
                  ? 'Data ETL'
                  : 'Custom'}
              </button>
            ))}
          </div>
        </div>

        {/* Pipelines Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* "Create New" Quick Card */}
          <div
            onClick={handleCreateClick}
            className={`p-6 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center space-y-3 cursor-pointer group min-h-[220px] ${
              isDark
                ? 'border-slate-800 hover:border-sky-500/70 bg-slate-900/30 hover:bg-slate-900/60'
                : 'border-slate-300 hover:border-sky-500 bg-white hover:bg-sky-50/30 shadow-xs'
            }`}
          >
            <div
              className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-colors ${
                isDark
                  ? 'bg-slate-900 border-slate-800 group-hover:border-sky-500 text-slate-400 group-hover:text-sky-400'
                  : 'bg-slate-100 border-slate-200 group-hover:border-sky-500 text-slate-500 group-hover:text-sky-600'
              }`}
            >
              <Plus className="w-6 h-6" />
            </div>
            <div>
              <div
                className={`text-sm font-bold transition-colors ${
                  isDark ? 'text-white group-hover:text-sky-400' : 'text-slate-900 group-hover:text-sky-600'
                }`}
              >
                Create New Pipeline
              </div>
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                {!canCreatePipeline ? 'Sign in required to create pipelines' : 'Start from a blank canvas or pre-seeded templates'}
              </p>
            </div>
          </div>

          {/* "Open from Google Drive" Quick Card (Hosted Platform only) */}
          {capabilities.allowGoogleDrive && (
            <div
              onClick={handleOpenFromDrive}
              className={`p-6 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center space-y-3 cursor-pointer group min-h-[220px] ${
                isDark
                  ? 'border-slate-800 hover:border-sky-500/70 bg-slate-900/30 hover:bg-slate-900/60'
                  : 'border-slate-300 hover:border-sky-500 bg-white hover:bg-sky-50/30 shadow-xs'
              }`}
            >
              <div
                className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-colors ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 group-hover:border-sky-500 text-slate-400 group-hover:text-sky-400'
                    : 'bg-slate-100 border-slate-200 group-hover:border-sky-500 text-slate-500 group-hover:text-sky-600'
                }`}
              >
                <Cloud className="w-6 h-6 text-sky-500" />
              </div>
              <div>
                <div
                  className={`text-sm font-bold transition-colors ${
                    isDark ? 'text-white group-hover:text-sky-400' : 'text-slate-900 group-hover:text-sky-600'
                  }`}
                >
                  Open from Google Drive
                </div>
                <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  {currentUser && hasDriveAccess
                    ? 'Browse & load cloud pipelines from your /FlowNotebook/ folder'
                    : 'Connect Google Drive to access your cloud-synced pipelines'}
                </p>
              </div>
            </div>
          )}

          {/* Existing & Synced Pipeline Cards */}
          {filteredPipelines.map((pipeline) => {
            const isCurrentlyOpening = openingId === pipeline.id;

            return (
              <div
                key={pipeline.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 group ${
                  isDark
                    ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:shadow-xl hover:shadow-sky-950/20'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md'
                }`}
              >
                {/* Card Header */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                      {getSourceBadge(pipeline.source)}
                      {getCategoryBadge(pipeline.category)}
                    </div>
                    <div className={`flex items-center space-x-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      <Clock className="w-3 h-3" />
                      <span className="text-[10px] font-mono">
                        {new Date(pipeline.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3
                      className={`text-sm font-bold transition-colors line-clamp-1 flex items-center space-x-1.5 ${
                        isDark ? 'text-white group-hover:text-sky-400' : 'text-slate-900 group-hover:text-sky-600'
                      }`}
                    >
                      {getCategoryIcon(pipeline.category)}
                      <span>{pipeline.name}</span>
                    </h3>
                    <p
                      className={`text-xs mt-1 line-clamp-2 leading-relaxed ${
                        isDark ? 'text-slate-400' : 'text-slate-600'
                      }`}
                    >
                      {pipeline.description}
                    </p>
                  </div>

                  {/* Storage Path - simple plain text, hidden for preset templates */}
                  {getPipelineLocation(pipeline) && (
                    <div
                      className={`text-[11px] font-mono truncate ${
                        isDark ? 'text-slate-400' : 'text-slate-500'
                      }`}
                      title={getPipelineLocation(pipeline) || undefined}
                    >
                      {getPipelineLocation(pipeline)}
                    </div>
                  )}
                </div>

                {/* Card Meta & Actions */}
                <div
                  className={`pt-3 border-t flex items-center justify-between ${
                    isDark ? 'border-slate-800/80' : 'border-slate-100'
                  }`}
                >
                  <div className={`text-[11px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      {pipeline.nodeCount || pipeline.nodes?.length || 0}
                    </span>{' '}
                    nodes •{' '}
                    <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      {pipeline.edgeCount || pipeline.edges?.length || 0}
                    </span>{' '}
                    wires
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => handleDuplicatePipelineItem(pipeline)}
                      title="Duplicate Pipeline"
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        isDark
                          ? 'text-slate-400 hover:text-sky-400 hover:bg-slate-800'
                          : 'text-slate-500 hover:text-sky-600 hover:bg-slate-100'
                      }`}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    {(isStandalone || currentUser) && (pipeline.source === 'custom' || pipeline.source === 'local' || pipeline.source === 'drive') && (
                      <button
                        onClick={() => handleDeletePipelineItem(pipeline)}
                        title="Delete Pipeline"
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          isDark
                            ? 'text-slate-400 hover:text-rose-400 hover:bg-slate-800'
                            : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {(() => {
                      const canOpen = isStandalone || !!currentUser;
                      return (
                        <button
                          onClick={() => handleOpenPipelineItem(pipeline)}
                          disabled={isCurrentlyOpening}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 shadow-xs cursor-pointer ml-1 ${
                            canOpen
                              ? 'bg-sky-600 hover:bg-sky-500 text-white'
                              : 'bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white'
                          }`}
                          title={canOpen ? 'Open in Canvas' : 'Sign in with Google to open and execute this pipeline'}
                        >
                          {isCurrentlyOpening ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Loading...</span>
                            </>
                          ) : !canOpen ? (
                            <>
                              <Lock className="w-3 h-3 text-white/90" />
                              <span>Sign In to Open</span>
                            </>
                          ) : (
                            <>
                              <span>Open</span>
                              <ArrowRight className="w-3 h-3" />
                            </>
                          )}
                        </button>
                      );
                    })()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredPipelines.length === 0 && (
          <div
            className={`p-12 text-center text-xs border rounded-2xl space-y-3 ${
              isDark ? 'text-slate-500 bg-slate-900/30 border-slate-800/80' : 'text-slate-400 bg-white border-slate-200 shadow-xs'
            }`}
          >
            {selectedSource === 'drive' && !currentUser ? (
              <div className="space-y-3">
                <Cloud className="w-8 h-8 text-sky-500 mx-auto" />
                <div className="font-semibold text-slate-300">Sign in to view your Google Drive pipelines</div>
                <button
                  onClick={handleGoogleSignIn}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold cursor-pointer transition-colors shadow-md"
                >
                  Sign In with Google
                </button>
              </div>
            ) : selectedSource === 'drive' && currentUser && !hasDriveAccess ? (
              <div className="space-y-3">
                <Cloud className="w-8 h-8 text-sky-500 mx-auto" />
                <div className="font-semibold text-slate-300">Google Drive permission required</div>
                <button
                  onClick={handleConnectDrive}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold cursor-pointer transition-colors shadow-md"
                >
                  Connect Google Drive
                </button>
              </div>
            ) : (
              <div>No pipelines found matching your filters.</div>
            )}
          </div>
        )}

        {/* Dashboard Footer */}
        <footer
          className={`pt-12 pb-6 text-xs flex flex-col sm:flex-row items-center justify-between gap-4 border-t mt-12 transition-colors ${
            isDark ? 'border-slate-800/80 text-slate-500' : 'border-slate-200 text-slate-400'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Workflow className="w-3.5 h-3.5 text-sky-500" />
            <span className={`font-semibold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>FlowNotebook</span>
            <span>— Visual DAG Execution</span>
          </div>
          <div className="flex items-center space-x-6">
            <button
              onClick={() => {
                setLegalModalTab('terms');
                setLegalModalOpen(true);
              }}
              className={`hover:underline transition-colors cursor-pointer ${
                isDark ? 'hover:text-slate-300' : 'hover:text-slate-700'
              }`}
            >
              Terms of Service
            </button>
            <button
              onClick={() => {
                setLegalModalTab('privacy');
                setLegalModalOpen(true);
              }}
              className={`hover:underline transition-colors cursor-pointer ${
                isDark ? 'hover:text-slate-300' : 'hover:text-slate-700'
              }`}
            >
              Privacy Policy
            </button>
            <span>MIT License</span>
          </div>
        </footer>
      </main>

      {/* Sign In Required / Demo Mode Gate Modal */}
      {authPromptAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div
            className={`relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border ${
              isDark ? 'bg-[#0e1422] border-slate-700/80 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div
              className={`flex items-center justify-between px-6 py-4 border-b transition-colors ${
                isDark ? 'bg-[#141b2d] border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <div
                  className={`p-1.5 rounded-lg border ${
                    isDark ? 'bg-sky-950 text-sky-400 border-sky-800' : 'bg-sky-50 text-sky-700 border-sky-200'
                  }`}
                >
                  <Lock className="w-4 h-4 text-sky-400" />
                </div>
                <h2 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Google Sign-In Required
                </h2>
              </div>
              <button
                onClick={() => setAuthPromptAction(null)}
                className={`p-1 rounded-lg transition-colors cursor-pointer ${
                  isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-start space-x-3.5">
                <div className="p-3 bg-gradient-to-tr from-sky-500/20 to-indigo-600/20 rounded-2xl shrink-0 text-sky-400 border border-sky-500/30">
                  <Workflow className="w-6 h-6 text-sky-500" />
                </div>
                <div className="space-y-1">
                  <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {authPromptAction === 'create'
                      ? 'Sign In to Create Pipelines'
                      : authPromptAction === 'open'
                      ? 'Sign In to Open & Run Pipelines'
                      : authPromptAction === 'import'
                      ? 'Sign In to Import Pipelines'
                      : authPromptAction === 'duplicate'
                      ? 'Sign In to Duplicate Pipelines'
                      : 'Sign In to Continue'}
                  </h3>
                  <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {authPromptAction === 'create'
                      ? 'The dashboard is currently in Demo Mode. To create, configure, and save your custom visual DAG pipelines, please sign in with Google.'
                      : authPromptAction === 'open'
                      ? 'The dashboard is currently in Demo Mode for sample browsing. Sign in with Google to open this pipeline into the visual canvas and execute Python code.'
                      : authPromptAction === 'import'
                      ? 'To import local .flownb pipelines and run DAG workflows, please sign in with your Google account.'
                      : 'Sign in with Google to duplicate and customize this pipeline workflow.'}
                  </p>
                </div>
              </div>

              <div className={`p-3.5 rounded-xl border text-xs space-y-2.5 ${
                isDark ? 'bg-slate-900/60 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}>
                <div className="flex items-center space-x-2.5">
                  <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>Free Google Drive cloud synchronization & auto-save</span>
                </div>
                <div className="flex items-center space-x-2.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Isolated workspace with private pipeline persistence</span>
                </div>
                <div className="flex items-center space-x-2.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>Real-time Python execution with zero-mutation namespaces</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setAuthPromptAction(null)}
                  className={`px-4 py-2 text-xs font-medium rounded-xl transition-colors cursor-pointer border ${
                    isDark
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-xs'
                  }`}
                >
                  Continue Browsing Demo
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setAuthPromptAction(null);
                    await handleGoogleSignIn();
                  }}
                  className="px-5 py-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center space-x-1.5"
                >
                  <Cloud className="w-3.5 h-3.5" />
                  <span>Sign In with Google</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Pipeline Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div
            className={`relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border ${
              isDark ? 'bg-[#0e1422] border-slate-700/80 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div
              className={`flex items-center justify-between px-6 py-4 border-b transition-colors ${
                isDark ? 'bg-[#141b2d] border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <div
                  className={`p-1.5 rounded-lg border ${
                    isDark ? 'bg-sky-950 text-sky-400 border-sky-800' : 'bg-sky-50 text-sky-700 border-sky-200'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                </div>
                <h2 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Create New Python Pipeline
                </h2>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className={`p-1 rounded-lg transition-colors cursor-pointer ${
                  isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div>
                <label
                  className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  Pipeline Name
                </label>
                <input
                  type="text"
                  required
                  value={newPipelineName}
                  onChange={(e) => setNewPipelineName(e.target.value)}
                  placeholder="e.g., Sentiment Analysis NLP Pipeline"
                  className={`w-full px-3.5 py-2 rounded-xl text-sm outline-none border transition-colors ${
                    isDuplicateName
                      ? 'border-rose-500 text-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                      : isDark
                      ? 'bg-slate-900 border-slate-700 text-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500'
                      : 'bg-white border-slate-300 text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500'
                  }`}
                />
                {isDuplicateName && (
                  <p className="mt-1.5 text-xs text-rose-500 font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    A pipeline named &quot;{newPipelineName.trim()}&quot; already exists. Please choose a different name.
                  </p>
                )}
              </div>

              <div>
                <label
                  className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  Category / Template
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setNewPipelineCategory('custom')}
                    className={`p-3 rounded-xl border text-left flex items-center space-x-2.5 transition-all cursor-pointer ${
                      newPipelineCategory === 'custom'
                        ? isDark
                          ? 'bg-sky-950/80 border-sky-500 ring-1 ring-sky-500'
                          : 'bg-sky-50 border-sky-500 ring-1 ring-sky-500'
                        : isDark
                        ? 'bg-slate-900 border-slate-800'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Layers className="w-4 h-4 text-sky-500" />
                    <div>
                      <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Blank Canvas</div>
                      <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Empty workflow</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewPipelineCategory('quant')}
                    className={`p-3 rounded-xl border text-left flex items-center space-x-2.5 transition-all cursor-pointer ${
                      newPipelineCategory === 'quant'
                        ? isDark
                          ? 'bg-emerald-950/80 border-emerald-500 ring-1 ring-emerald-500'
                          : 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500'
                        : isDark
                        ? 'bg-slate-900 border-slate-800'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    <div>
                      <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Quantitative</div>
                      <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Trading backtest</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewPipelineCategory('ml')}
                    className={`p-3 rounded-xl border text-left flex items-center space-x-2.5 transition-all cursor-pointer ${
                      newPipelineCategory === 'ml'
                        ? isDark
                          ? 'bg-purple-950/80 border-purple-500 ring-1 ring-purple-500'
                          : 'bg-purple-50 border-purple-500 ring-1 ring-purple-500'
                        : isDark
                        ? 'bg-slate-900 border-slate-800'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <BrainCircuit className="w-4 h-4 text-purple-500" />
                    <div>
                      <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Machine Learning</div>
                      <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Model training</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewPipelineCategory('etl')}
                    className={`p-3 rounded-xl border text-left flex items-center space-x-2.5 transition-all cursor-pointer ${
                      newPipelineCategory === 'etl'
                        ? isDark
                          ? 'bg-amber-950/80 border-amber-500 ring-1 ring-amber-500'
                          : 'bg-amber-50 border-amber-500 ring-1 ring-amber-500'
                        : isDark
                        ? 'bg-slate-900 border-slate-800'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Database className="w-4 h-4 text-amber-500" />
                    <div>
                      <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Data ETL</div>
                      <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Cleaning pipeline</div>
                    </div>
                  </button>
                </div>
              </div>

              <div
                className={`pt-3 flex items-center justify-end space-x-2 border-t ${
                  isDark ? 'border-slate-800' : 'border-slate-200'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer border ${
                    isDark
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-xs'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newPipelineName.trim() || isDuplicateName}
                  className={`px-5 py-2 text-xs font-bold rounded-lg transition-colors shadow-md ${
                    !newPipelineName.trim() || isDuplicateName
                      ? 'bg-slate-400 dark:bg-slate-700 text-slate-200 dark:text-slate-500 cursor-not-allowed opacity-60 shadow-none'
                      : 'bg-sky-600 hover:bg-sky-500 text-white cursor-pointer'
                  }`}
                >
                  Create & Launch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Google Drive File Picker Modal (Hosted Platform only) */}
      {!isStandalone && isDrivePickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div
            className={`relative w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border flex flex-col max-h-[85vh] ${
              isDark ? 'bg-[#0e1422] border-slate-700/80 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {/* Header */}
            <div
              className={`flex items-center justify-between px-6 py-4 border-b transition-colors ${
                isDark ? 'bg-[#141b2d] border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <div
                  className={`p-2 rounded-xl border ${
                    isDark ? 'bg-sky-950 text-sky-400 border-sky-800' : 'bg-sky-50 text-sky-700 border-sky-200'
                  }`}
                >
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h2 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Open from Google Drive
                  </h2>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Select a pipeline stored in your cloud <code className="text-sky-500 font-mono">/FlowNotebook/</code> folder
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDrivePickerOpen(false)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search & Refresh */}
            <div className={`p-4 border-b flex items-center justify-between gap-3 ${
              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50/50 border-slate-200'
            }`}>
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={driveSearchQuery}
                  onChange={(e) => setDriveSearchQuery(e.target.value)}
                  placeholder="Search Google Drive pipelines..."
                  className={`w-full pl-9 pr-3.5 py-1.5 rounded-xl text-xs outline-none border transition-all ${
                    isDark
                      ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-sky-500'
                      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-sky-500 shadow-xs'
                  }`}
                />
              </div>

              <button
                onClick={syncStoragePipelines}
                disabled={isSyncing}
                title="Refresh Google Drive files"
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer shrink-0 ${
                  isDark
                    ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-xs'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 text-sky-500 ${isSyncing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>

            {/* List of Files */}
            <div className="p-4 overflow-y-auto space-y-2 flex-1 min-h-[220px]">
              {isSyncing ? (
                <div className={`p-8 text-center text-xs flex flex-col items-center justify-center space-y-2 ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
                  <span>Loading files from Google Drive...</span>
                </div>
              ) : driveProjects.length > 0 ? (
                driveProjects
                  .filter((dp) => dp.name.toLowerCase().includes(driveSearchQuery.toLowerCase()))
                  .map((dp) => {
                    const isOpeningThis = openingId === `drive_${dp.id}`;

                    return (
                      <div
                        key={dp.id}
                        className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                          isDark
                            ? 'bg-slate-900/80 border-slate-800 hover:border-sky-500/70 hover:bg-slate-900'
                            : 'bg-white border-slate-200 hover:border-sky-500 hover:bg-sky-50/20 shadow-xs'
                        }`}
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className={`p-2 rounded-lg border shrink-0 ${
                            isDark ? 'bg-sky-950/60 border-sky-800 text-sky-400' : 'bg-sky-50 border-sky-200 text-sky-600'
                          }`}>
                            <FileCode2 className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              {dp.name}
                            </div>
                            <div className={`text-[10px] flex items-center space-x-2 mt-0.5 ${
                              isDark ? 'text-slate-400' : 'text-slate-500'
                            }`}>
                              <span>{new Date(dp.updatedAt).toLocaleDateString()}</span>
                              <span>•</span>
                              <span className="font-mono text-sky-500">/FlowNotebook/{dp.name}.flownb</span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={async () => {
                            setIsDrivePickerOpen(false);
                            if (dp.id) {
                              await handleOpenPipelineItem({
                                id: `drive_${dp.id}`,
                                name: dp.name,
                                category: 'custom',
                                description: `Google Drive file (${dp.nodeCount || 0} nodes)`,
                                updatedAt: dp.updatedAt,
                                nodeCount: dp.nodeCount || 0,
                                edgeCount: dp.edgeCount || 0,
                                nodes: [],
                                edges: [],
                                source: 'drive',
                                fileId: dp.id,
                              });
                            }
                          }}
                          disabled={isOpeningThis}
                          className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center space-x-1 cursor-pointer shrink-0 ml-3"
                        >
                          {isOpeningThis ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Opening...</span>
                            </>
                          ) : (
                            <>
                              <span>Open</span>
                              <ArrowRight className="w-3 h-3" />
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })
              ) : !currentUser ? (
                <div className={`p-8 text-center text-xs space-y-3 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  <Cloud className="w-8 h-8 text-sky-500 mx-auto" />
                  <p>Sign in with your Google account to browse and open cloud pipelines.</p>
                  <button
                    onClick={async () => {
                      await handleGoogleSignIn();
                      setIsDrivePickerOpen(false);
                    }}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold cursor-pointer transition-colors shadow-md"
                  >
                    Sign In with Google
                  </button>
                </div>
              ) : !hasDriveAccess ? (
                <div className={`p-8 text-center text-xs space-y-3 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  <Cloud className="w-8 h-8 text-sky-500 mx-auto" />
                  <p>Google Drive permission is required to list your saved pipelines.</p>
                  <button
                    onClick={async () => {
                      await handleConnectDrive();
                      setIsDrivePickerOpen(false);
                    }}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold cursor-pointer transition-colors shadow-md"
                  >
                    Connect Google Drive
                  </button>
                </div>
              ) : (
                <div className={`p-8 text-center text-xs space-y-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  <Cloud className="w-8 h-8 text-sky-500/50 mx-auto" />
                  <p className="font-semibold text-slate-300">No pipelines found in Google Drive</p>
                  <p className="text-[11px]">Save pipelines to Google Drive from the canvas or dashboard to see them here.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={`px-6 py-3.5 border-t flex items-center justify-between transition-colors ${
              isDark ? 'bg-[#111827] border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Folder: <strong className="font-mono text-sky-500">Google Drive / FlowNotebook /</strong>
              </span>
              <button
                type="button"
                onClick={() => setIsDrivePickerOpen(false)}
                className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer border ${
                  isDark
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-xs'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal - Single Direct Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div
            className={`relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border ${
              isDark ? 'bg-[#0e1422] border-slate-700/80 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {/* Modal Header */}
            <div
              className={`flex items-center justify-between px-6 py-4 border-b transition-colors ${
                isDark ? 'bg-[#141b2d] border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <div
                  className={`p-2 rounded-xl border ${
                    isDark ? 'bg-rose-950 text-rose-400 border-rose-800' : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Delete Pipeline
                  </h2>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Confirm deletion of <strong className={isDark ? 'text-white' : 'text-slate-900'}>"{deleteTarget.name}"</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => !isDeleting && setDeleteTarget(null)}
                disabled={isDeleting}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {deleteTarget && getPipelineLocation(deleteTarget) && (
                <div className={`p-2.5 rounded-lg border text-xs font-mono break-all ${
                  isDark ? 'bg-slate-900/90 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}>
                  {getPipelineLocation(deleteTarget)}
                </div>
              )}

              {deleteError && (
                <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{deleteError}</span>
                </div>
              )}

              <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                Are you sure you want to delete this pipeline? This will permanently remove the pipeline graph configuration and its workspace directory from disk.
              </p>
            </div>

            {/* Modal Footer */}
            <div
              className={`flex items-center justify-end space-x-3 px-6 py-4 border-t transition-colors ${
                isDark ? 'bg-[#111827] border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer border ${
                  isDark
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-xs'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => executeDeletePipeline(deleteTarget)}
                className="flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer bg-rose-600 hover:bg-rose-500 text-white shadow-sm disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Pipeline</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Legal & Privacy Policy Modal */}
      <LegalModal
        isOpen={legalModalOpen}
        onClose={() => setLegalModalOpen(false)}
        initialTab={legalModalTab}
      />
    </div>
  );
};
