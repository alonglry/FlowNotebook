import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  FolderOpen,
  Cloud,
  HardDrive,
  Download,
  Upload,
  CheckCircle,
  Loader2,
  FileCode2
} from 'lucide-react';
import { useGraphStore } from '../store/useGraphStore';
import { storageManager, type ProjectMetadata } from '../services/storage';

interface StorageModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'save' | 'open';
}

export const StorageModal: React.FC<StorageModalProps> = ({
  isOpen,
  onClose,
  defaultMode = 'save',
}) => {
  const nodes = useGraphStore((state) => state.nodes);
  const edges = useGraphStore((state) => state.edges);
  const projectName = useGraphStore((state) => state.projectName);
  const setProjectName = useGraphStore((state) => state.setProjectName);
  const loadProjectData = useGraphStore((state) => state.loadProjectData);
  const currentUser = useGraphStore((state) => state.currentUser);
  const setCurrentUser = useGraphStore((state) => state.setCurrentUser);

  const [mode, setMode] = useState<'save' | 'open'>(defaultMode);
  const [selectedDestination, setSelectedDestination] = useState<'google_drive' | 'local_storage' | 'file'>('google_drive');
  const [nameInput, setNameInput] = useState(projectName || 'My Trading Pipeline');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const [localProjects, setLocalProjects] = useState<ProjectMetadata[]>([]);
  const [driveProjects, setDriveProjects] = useState<ProjectMetadata[]>([]);
  const [isLoadingDriveList, setIsLoadingDriveList] = useState(false);

  const isGoogleAuth = storageManager.googleDriveProvider.isAuthenticated;
  const hasDriveAccess = storageManager.googleDriveProvider.hasDriveAccess;

  useEffect(() => {
    setMode(defaultMode);
  }, [defaultMode]);

  useEffect(() => {
    if (isOpen) {
      loadSavedLists();
      setNameInput(projectName || 'My Trading Pipeline');
      setStatusMessage(null);
    }
  }, [isOpen, isGoogleAuth, hasDriveAccess]);

  const loadSavedLists = async () => {
    // Local list
    const locals = await storageManager.localStorageProvider.listProjects();
    setLocalProjects(locals);

    // Drive list if authenticated and granted drive access
    if (storageManager.googleDriveProvider.isAuthenticated && storageManager.googleDriveProvider.hasDriveAccess) {
      setIsLoadingDriveList(true);
      const drives = await storageManager.googleDriveProvider.listProjects();
      setDriveProjects(drives);
      setIsLoadingDriveList(false);
    } else {
      setDriveProjects([]);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsProcessing(true);
    const user = await storageManager.googleDriveProvider.signIn();
    if (user) {
      setCurrentUser(user);
      setStatusMessage({ type: 'success', text: `Signed in as ${user.name}` });
      loadSavedLists();
    }
    setIsProcessing(false);
  };

  const handleConnectDrive = async () => {
    setIsProcessing(true);
    const granted = await storageManager.googleDriveProvider.requestDriveAccess();
    if (granted) {
      if (storageManager.googleDriveProvider.user) {
        setCurrentUser(storageManager.googleDriveProvider.user);
      }
      setStatusMessage({ type: 'success', text: 'Google Drive connected successfully' });
      loadSavedLists();
    } else {
      setStatusMessage({ type: 'error', text: 'Google Drive access was not granted' });
    }
    setIsProcessing(false);
  };

  const handleSave = async () => {
    if (!nameInput.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter a pipeline name.' });
      return;
    }

    const cleanName = nameInput.trim();
    setProjectName(cleanName);
    setIsProcessing(true);
    setStatusMessage(null);

    const projectPayload = {
      version: '1.0.0',
      name: cleanName,
      savedAt: Date.now(),
      nodes,
      edges,
    };

    let result;
    if (selectedDestination === 'google_drive') {
      result = await storageManager.googleDriveProvider.saveProject(projectPayload);
      if (result.success && storageManager.googleDriveProvider.user) {
        setCurrentUser(storageManager.googleDriveProvider.user);
      }
    } else if (selectedDestination === 'file') {
      result = await storageManager.fileExportProvider.saveProject(projectPayload);
    } else {
      result = await storageManager.localStorageProvider.saveProject(projectPayload);
    }

    setIsProcessing(false);

    if (result.success) {
      setStatusMessage({ type: 'success', text: result.message || 'Saved successfully!' });
      loadSavedLists();
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      setStatusMessage({ type: 'error', text: result.message || 'Save failed.' });
    }
  };

  const handleOpenLocal = async (pName: string) => {
    setIsProcessing(true);
    const data = await storageManager.localStorageProvider.loadProject(pName);
    if (data) {
      loadProjectData(data);
      setStatusMessage({ type: 'success', text: `Loaded ${data.name}` });
      setTimeout(() => onClose(), 600);
    }
    setIsProcessing(false);
  };

  const handleOpenDrive = async (fileId: string) => {
    setIsProcessing(true);
    const data = await storageManager.googleDriveProvider.loadProject(fileId);
    if (data) {
      loadProjectData(data);
      setStatusMessage({ type: 'success', text: `Loaded ${data.name} from Drive` });
      setTimeout(() => onClose(), 600);
    }
    setIsProcessing(false);
  };

  const handleOpenFilePicker = async () => {
    const data = await storageManager.fileExportProvider.loadProject();
    if (data) {
      loadProjectData(data);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0e1422] border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#141b2d] border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-sky-950 text-sky-400 rounded-lg border border-sky-800">
              {mode === 'save' ? <Save className="w-5 h-5" /> : <FolderOpen className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {mode === 'save' ? 'Save FlowNotebook Pipeline' : 'Open Saved Pipeline'}
              </h2>
              <p className="text-xs text-slate-400">
                {mode === 'save'
                  ? 'Store your visual DAG canvas to Google Drive or local storage'
                  : 'Resume an existing workflow from cloud or disk'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Mode Switcher */}
            <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800 text-xs">
              <button
                onClick={() => {
                  setMode('save');
                  setStatusMessage(null);
                }}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  mode === 'save' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Save
              </button>
              <button
                onClick={() => {
                  setMode('open');
                  setStatusMessage(null);
                }}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  mode === 'open' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Open
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Alert */}
        {statusMessage && (
          <div
            className={`px-6 py-2.5 text-xs font-medium flex items-center space-x-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/80 text-emerald-300 border-b border-emerald-800'
                : 'bg-rose-950/80 text-rose-300 border-b border-rose-800'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <X className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* SAVE MODE */}
          {mode === 'save' && (
            <div className="space-y-4">
              {/* Project Name Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Pipeline Name
                </label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g., Backtesting Alpha Strategy"
                  className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-sm text-white font-medium focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-all"
                />
              </div>

              {/* Destination Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Choose Destination
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Google Drive Option */}
                  <button
                    type="button"
                    onClick={() => setSelectedDestination('google_drive')}
                    className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      selectedDestination === 'google_drive'
                        ? 'bg-sky-950/60 border-sky-500 ring-1 ring-sky-500'
                        : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <Cloud className="w-5 h-5 text-sky-400" />
                      {hasDriveAccess && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Google Drive</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {hasDriveAccess ? `Folder: /FlowNotebook/` : 'Save to Google Drive'}
                      </div>
                    </div>
                  </button>

                  {/* Browser Storage */}
                  <button
                    type="button"
                    onClick={() => setSelectedDestination('local_storage')}
                    className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      selectedDestination === 'local_storage'
                        ? 'bg-sky-950/60 border-sky-500 ring-1 ring-sky-500'
                        : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <HardDrive className="w-5 h-5 text-emerald-400 mb-2" />
                    <div>
                      <div className="text-xs font-bold text-white">Browser Storage</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">Save in browser cache</div>
                    </div>
                  </button>

                  {/* Export File */}
                  <button
                    type="button"
                    onClick={() => setSelectedDestination('file')}
                    className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      selectedDestination === 'file'
                        ? 'bg-sky-950/60 border-sky-500 ring-1 ring-sky-500'
                        : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <Download className="w-5 h-5 text-purple-400 mb-2" />
                    <div>
                      <div className="text-xs font-bold text-white">Download File</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">Export .flownb file</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Google Drive Status Banner */}
              {selectedDestination === 'google_drive' && (
                <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                  {currentUser ? (
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center space-x-2.5">
                        {currentUser.avatarUrl ? (
                          <img src={currentUser.avatarUrl} alt="" className="w-6 h-6 rounded-full" />
                        ) : (
                          <Cloud className="w-5 h-5 text-sky-400" />
                        )}
                        <div>
                          <div className="font-semibold text-white">{currentUser.name}</div>
                          <div className="text-[11px] text-slate-400">{currentUser.email}</div>
                        </div>
                      </div>
                      {hasDriveAccess ? (
                        <span className="text-[11px] text-emerald-400 font-medium flex items-center space-x-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                          <span>Drive connected</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-sky-400">
                          Drive permission requested on save
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between w-full">
                      <span className="text-slate-300">Connect your Google account to save to Drive</span>
                      <button
                        onClick={handleGoogleSignIn}
                        disabled={isProcessing}
                        className="px-3 py-1.5 bg-white text-slate-900 font-semibold rounded-lg hover:bg-slate-100 transition-colors shadow-sm flex items-center space-x-1.5 cursor-pointer"
                      >
                        <Cloud className="w-3.5 h-3.5 text-sky-600" />
                        <span>Sign in with Google</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* OPEN MODE */}
          {mode === 'open' && (
            <div className="space-y-4">
              {/* Upload Local File Button */}
              <button
                onClick={handleOpenFilePicker}
                className="w-full p-4 border border-dashed border-slate-700 hover:border-sky-500 rounded-xl bg-slate-900/60 hover:bg-slate-900 flex items-center justify-center space-x-2.5 text-xs font-semibold text-sky-400 hover:text-sky-300 transition-all cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Upload .flownb or .json File from Computer</span>
              </button>

              {/* Google Drive Files List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                  <span className="flex items-center space-x-1.5">
                    <Cloud className="w-4 h-4 text-sky-400" />
                    <span>Google Drive Pipelines (/FlowNotebook/)</span>
                  </span>
                  {!currentUser ? (
                    <button
                      onClick={handleGoogleSignIn}
                      className="text-sky-400 hover:underline text-[11px] cursor-pointer"
                    >
                      Sign In with Google
                    </button>
                  ) : !hasDriveAccess ? (
                    <button
                      onClick={handleConnectDrive}
                      className="text-sky-400 hover:underline text-[11px] cursor-pointer font-medium"
                    >
                      Connect Drive
                    </button>
                  ) : null}
                </div>

                {isLoadingDriveList ? (
                  <div className="p-4 text-center text-slate-500 text-xs flex items-center justify-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                    <span>Loading Google Drive files...</span>
                  </div>
                ) : driveProjects.length > 0 ? (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {driveProjects.map((dp) => (
                      <div
                        key={dp.id}
                        className="flex items-center justify-between p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs hover:border-sky-500/60 transition-colors"
                      >
                        <div className="flex items-center space-x-2">
                          <FileCode2 className="w-4 h-4 text-sky-400" />
                          <span className="font-semibold text-white">{dp.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(dp.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <button
                          onClick={() => dp.id && handleOpenDrive(dp.id)}
                          className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded font-medium text-[11px] transition-colors cursor-pointer"
                        >
                          Load
                        </button>
                      </div>
                    ))}
                  </div>
                ) : currentUser && !hasDriveAccess ? (
                  <div className="p-3.5 bg-slate-900/50 border border-slate-800/80 rounded-lg text-center flex flex-col items-center justify-center space-y-2">
                    <span className="text-xs text-slate-400">
                      Connect Google Drive to view and load your cloud pipelines.
                    </span>
                    <button
                      type="button"
                      onClick={handleConnectDrive}
                      disabled={isProcessing}
                      className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition-colors"
                    >
                      <Cloud className="w-3.5 h-3.5" />
                      <span>Connect Google Drive</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-900/50 border border-slate-800/80 rounded-lg text-[11px] text-slate-500 text-center italic">
                    {currentUser ? 'No saved pipelines in Drive yet.' : 'Sign in to access your Google Drive pipelines.'}
                  </div>
                )}
              </div>

              {/* Local Storage Saved Projects */}
              <div className="space-y-2">
                <div className="text-xs text-slate-400 font-semibold flex items-center space-x-1.5">
                  <HardDrive className="w-4 h-4 text-emerald-400" />
                  <span>Browser Storage Pipelines</span>
                </div>

                {localProjects.length > 0 ? (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {localProjects.map((lp) => (
                      <div
                        key={lp.name}
                        className="flex items-center justify-between p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs hover:border-emerald-500/60 transition-colors"
                      >
                        <div className="flex items-center space-x-2">
                          <FileCode2 className="w-4 h-4 text-emerald-400" />
                          <span className="font-semibold text-white">{lp.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {lp.nodeCount} nodes • {new Date(lp.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <button
                          onClick={() => handleOpenLocal(lp.name)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium text-[11px] transition-colors cursor-pointer"
                        >
                          Load
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-900/50 border border-slate-800/80 rounded-lg text-[11px] text-slate-500 text-center italic">
                    No pipelines saved in browser storage yet.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {mode === 'save' && (
          <div className="flex items-center justify-between px-6 py-3.5 bg-[#111827] border-t border-slate-800">
            <span className="text-xs text-slate-500">
              {nodes.length} nodes & {edges.length} connections ready to save
            </span>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isProcessing}
                className="px-5 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors shadow-md flex items-center space-x-1.5 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Pipeline</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
