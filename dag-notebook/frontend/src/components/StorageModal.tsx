import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  FolderOpen,
  Cloud,
  HardDrive,
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
  const theme = useGraphStore((state) => state.theme);
  const isDark = theme === 'dark';

  const nodes = useGraphStore((state) => state.nodes);
  const edges = useGraphStore((state) => state.edges);
  const projectName = useGraphStore((state) => state.projectName);
  const setProjectName = useGraphStore((state) => state.setProjectName);
  const loadProjectData = useGraphStore((state) => state.loadProjectData);
  const currentUser = useGraphStore((state) => state.currentUser);
  const setCurrentUser = useGraphStore((state) => state.setCurrentUser);

  const [mode, setMode] = useState<'save' | 'open'>(defaultMode);
  const [selectedDestination, setSelectedDestination] = useState<'file' | 'google_drive'>('file');
  const [nameInput, setNameInput] = useState(projectName || 'My Trading Pipeline');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const [driveProjects, setDriveProjects] = useState<ProjectMetadata[]>([]);
  const [isLoadingDriveList, setIsLoadingDriveList] = useState(false);

  const isGoogleAuth = storageManager.googleDriveProvider.isAuthenticated;
  const hasDriveAccess = storageManager.googleDriveProvider.hasDriveAccess;

  useEffect(() => {
    setMode(defaultMode);
  }, [defaultMode]);

  useEffect(() => {
    if (isOpen) {
      loadDriveList();
      setNameInput(projectName || 'My Trading Pipeline');
      setStatusMessage(null);
    }
  }, [isOpen, isGoogleAuth, hasDriveAccess]);

  const loadDriveList = async () => {
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
      loadDriveList();
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
      loadDriveList();
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
    } else {
      // Save to local computer disk directly
      result = await storageManager.fileExportProvider.saveProject(projectPayload);
    }

    setIsProcessing(false);

    if (result.success) {
      setStatusMessage({ type: 'success', text: result.message || 'Saved successfully!' });
      loadDriveList();
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      setStatusMessage({ type: 'error', text: result.message || 'Save failed.' });
    }
  };

  const handleOpenDrive = async (fileId: string) => {
    setIsProcessing(true);
    const data = await storageManager.googleDriveProvider.loadProject(fileId);
    if (data) {
      loadProjectData({
        ...data,
        source: 'drive',
        fileId,
      });
      setStatusMessage({ type: 'success', text: `Loaded ${data.name} from Drive` });
      setTimeout(() => onClose(), 600);
    }
    setIsProcessing(false);
  };

  const handleOpenFilePicker = async () => {
    const data = await storageManager.fileExportProvider.loadProject();
    if (data) {
      loadProjectData({
        ...data,
        source: 'custom',
      });
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className={`relative w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden border ${
        isDark ? 'bg-[#0e1422] border-slate-700/80 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b transition-colors ${
          isDark ? 'bg-[#141b2d] border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg border ${
              isDark ? 'bg-sky-950 text-sky-400 border-sky-800' : 'bg-sky-50 text-sky-700 border-sky-200'
            }`}>
              {mode === 'save' ? <Save className="w-5 h-5" /> : <FolderOpen className="w-5 h-5" />}
            </div>
            <div>
              <h2 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {mode === 'save' ? 'Save FlowNotebook Pipeline' : 'Open Saved Pipeline'}
              </h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {mode === 'save'
                  ? 'Store your visual DAG canvas to Google Drive or local storage'
                  : 'Resume an existing workflow from cloud or disk'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Mode Switcher */}
            <div className={`flex rounded-lg p-1 border text-xs ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <button
                onClick={() => {
                  setMode('save');
                  setStatusMessage(null);
                }}
                className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  mode === 'save'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Save
              </button>
              <button
                onClick={() => {
                  setMode('open');
                  setStatusMessage(null);
                }}
                className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  mode === 'open'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Open
              </button>
            </div>

            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors ml-2 cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
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
                ? isDark
                  ? 'bg-emerald-950/80 text-emerald-300 border-b border-emerald-800'
                  : 'bg-emerald-50 text-emerald-800 border-b border-emerald-200'
                : isDark
                ? 'bg-rose-950/80 text-rose-300 border-b border-rose-800'
                : 'bg-rose-50 text-rose-800 border-b border-rose-200'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <X className="w-4 h-4 text-rose-500 shrink-0" />
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
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${
                  isDark ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  Pipeline Name
                </label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g., Backtesting Alpha Strategy"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-medium focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-all border ${
                    isDark
                      ? 'bg-slate-900/90 border-slate-700 text-white'
                      : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              {/* Destination Selector */}
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${
                  isDark ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  Choose Destination
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Save to Local Option */}
                  <button
                    type="button"
                    onClick={() => setSelectedDestination('file')}
                    className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      selectedDestination === 'file'
                        ? isDark
                          ? 'bg-sky-950/60 border-sky-500 ring-1 ring-sky-500'
                          : 'bg-sky-50 border-sky-500 ring-1 ring-sky-500'
                        : isDark
                        ? 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <HardDrive className="w-5 h-5 text-emerald-500" />
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        isDark ? 'bg-emerald-950 text-emerald-300' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        Direct Disk Save
                      </span>
                    </div>
                    <div>
                      <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Save to Local (.flownb)</div>
                      <div className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Choose path & save file to your local computer
                      </div>
                    </div>
                  </button>

                  {/* Google Drive Option */}
                  <button
                    type="button"
                    onClick={() => setSelectedDestination('google_drive')}
                    className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      selectedDestination === 'google_drive'
                        ? isDark
                          ? 'bg-sky-950/60 border-sky-500 ring-1 ring-sky-500'
                          : 'bg-sky-50 border-sky-500 ring-1 ring-sky-500'
                        : isDark
                        ? 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <Cloud className="w-5 h-5 text-sky-500" />
                      {hasDriveAccess && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-400/50" />
                      )}
                    </div>
                    <div>
                      <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Google Drive</div>
                      <div className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {hasDriveAccess ? `Folder: /FlowNotebook/` : 'Save to Google Drive'}
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Google Drive Status Banner */}
              {selectedDestination === 'google_drive' && (
                <div className={`p-3.5 border rounded-xl flex items-center justify-between text-xs ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  {currentUser ? (
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center space-x-2.5">
                        {currentUser.avatarUrl ? (
                          <img src={currentUser.avatarUrl} alt="" className="w-6 h-6 rounded-full" />
                        ) : (
                          <Cloud className="w-5 h-5 text-sky-500" />
                        )}
                        <div>
                          <div className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentUser.name}</div>
                          <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{currentUser.email}</div>
                        </div>
                      </div>
                      {hasDriveAccess ? (
                        <span className="text-[11px] text-emerald-500 font-medium flex items-center space-x-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                          <span>Drive connected</span>
                        </span>
                      ) : (
                        <span className={`text-[11px] font-medium ${isDark ? 'text-sky-400' : 'text-sky-600'}`}>
                          Drive permission requested on save
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between w-full">
                      <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>Connect your Google account to save to Drive</span>
                      <button
                        onClick={handleGoogleSignIn}
                        disabled={isProcessing}
                        className={`px-3 py-1.5 font-semibold rounded-lg transition-colors shadow-sm flex items-center space-x-1.5 cursor-pointer border ${
                          isDark
                            ? 'bg-white text-slate-900 hover:bg-slate-100'
                            : 'bg-white text-slate-800 hover:bg-slate-50 border-slate-200 shadow-xs'
                        }`}
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
                className={`w-full p-4 border border-dashed rounded-xl flex items-center justify-center space-x-2.5 text-xs font-semibold transition-all cursor-pointer ${
                  isDark
                    ? 'border-slate-700 hover:border-sky-500 bg-slate-900/60 hover:bg-slate-900 text-sky-400 hover:text-sky-300'
                    : 'border-slate-300 hover:border-sky-500 bg-slate-50 hover:bg-sky-50/50 text-sky-700'
                }`}
              >
                <FolderOpen className="w-4 h-4" />
                <span>Open Local File (.flownb) from Computer</span>
              </button>

              {/* Google Drive Files List */}
              <div className="space-y-2">
                <div className={`flex items-center justify-between text-xs font-semibold ${
                  isDark ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  <span className="flex items-center space-x-1.5">
                    <Cloud className="w-4 h-4 text-sky-500" />
                    <span>Google Drive Pipelines (/FlowNotebook/)</span>
                  </span>
                  {!currentUser ? (
                    <button
                      onClick={handleGoogleSignIn}
                      className="text-sky-600 hover:underline text-[11px] cursor-pointer"
                    >
                      Sign In with Google
                    </button>
                  ) : !hasDriveAccess ? (
                    <button
                      onClick={handleConnectDrive}
                      className="text-sky-600 hover:underline text-[11px] cursor-pointer font-medium"
                    >
                      Connect Drive
                    </button>
                  ) : null}
                </div>

                {isLoadingDriveList ? (
                  <div className={`p-4 text-center text-xs flex items-center justify-center space-x-2 ${
                    isDark ? 'text-slate-500' : 'text-slate-400'
                  }`}>
                    <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
                    <span>Loading Google Drive files...</span>
                  </div>
                ) : driveProjects.length > 0 ? (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {driveProjects.map((dp) => (
                      <div
                        key={dp.id}
                        className={`flex items-center justify-between p-2.5 rounded-lg text-xs transition-colors border ${
                          isDark
                            ? 'bg-slate-900 border-slate-800 hover:border-sky-500/60'
                            : 'bg-white border-slate-200 hover:border-sky-500 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <FileCode2 className="w-4 h-4 text-sky-500" />
                          <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{dp.name}</span>
                          <span className={`text-[10px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            {new Date(dp.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <button
                          onClick={() => dp.id && handleOpenDrive(dp.id)}
                          className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded font-medium text-[11px] transition-colors cursor-pointer shadow-2xs"
                        >
                          Load
                        </button>
                      </div>
                    ))}
                  </div>
                ) : currentUser && !hasDriveAccess ? (
                  <div className={`p-3.5 border rounded-lg text-center flex flex-col items-center justify-center space-y-2 ${
                    isDark ? 'bg-slate-900/50 border-slate-800/80' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
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
                  <div className={`p-3 border rounded-lg text-[11px] text-center italic ${
                    isDark ? 'bg-slate-900/50 border-slate-800/80 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}>
                    {currentUser ? 'No saved pipelines in Drive yet.' : 'Sign in to access your Google Drive pipelines.'}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {mode === 'save' && (
          <div className={`flex items-center justify-between px-6 py-3.5 border-t transition-colors ${
            isDark ? 'bg-[#111827] border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
              {nodes.length} nodes & {edges.length} connections ready to save
            </span>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
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
