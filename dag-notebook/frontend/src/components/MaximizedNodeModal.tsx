import React, { useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import {
  Play,
  Minimize2,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Plus,
} from 'lucide-react';
import { useGraphStore } from '../store/useGraphStore';
import { Terminal } from './Terminal';

export const MaximizedNodeModal: React.FC = () => {
  const theme = useGraphStore((state) => state.theme);
  const isDark = theme === 'dark';

  const maximizedNodeId = useGraphStore((state) => state.maximizedNodeId);
  const setMaximizedNodeId = useGraphStore((state) => state.setMaximizedNodeId);
  const nodes = useGraphStore((state) => state.nodes);
  const updateNodeCode = useGraphStore((state) => state.updateNodeCode);
  const updateNodeTitle = useGraphStore((state) => state.updateNodeTitle);
  const addNodeInput = useGraphStore((state) => state.addNodeInput);
  const removeNodeInput = useGraphStore((state) => state.removeNodeInput);
  const addNodeOutput = useGraphStore((state) => state.addNodeOutput);
  const removeNodeOutput = useGraphStore((state) => state.removeNodeOutput);
  const runNode = useGraphStore((state) => state.runNode);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [newInp, setNewInp] = useState('');
  const [newOut, setNewOut] = useState('');
  const [showAddInp, setShowAddInp] = useState(false);
  const [showAddOut, setShowAddOut] = useState(false);

  const node = nodes.find((n) => n.id === maximizedNodeId);

  useEffect(() => {
    if (node) {
      setTitleInput(node.data.title);
    }
  }, [node?.data.title]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMaximizedNodeId(null);
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && maximizedNodeId) {
        runNode(maximizedNodeId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [maximizedNodeId, runNode, setMaximizedNodeId]);

  if (!maximizedNodeId || !node) return null;

  const data = node.data;
  const status = data.execution?.status || 'idle';

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (titleInput.trim()) {
      updateNodeTitle(maximizedNodeId, titleInput.trim());
    }
  };

  const handleAddInput = (e: React.FormEvent) => {
    e.preventDefault();
    if (newInp.trim()) {
      addNodeInput(maximizedNodeId, newInp.trim());
      setNewInp('');
      setShowAddInp(false);
    }
  };

  const handleAddOutput = (e: React.FormEvent) => {
    e.preventDefault();
    if (newOut.trim()) {
      addNodeOutput(maximizedNodeId, newOut.trim());
      setNewOut('');
      setShowAddOut(false);
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'running':
        return (
          <span className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs animate-pulse ${
            isDark ? 'bg-amber-950/80 border border-amber-600/50 text-amber-300' : 'bg-amber-50 border border-amber-300 text-amber-800'
          }`}>
            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
            <span>Running...</span>
          </span>
        );
      case 'queued':
        return (
          <span className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs ${
            isDark ? 'bg-sky-950/80 border border-sky-600/50 text-sky-300' : 'bg-sky-50 border border-sky-300 text-sky-800'
          }`}>
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
            <span>Queued</span>
          </span>
        );
      case 'success':
        return (
          <span className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs ${
            isDark ? 'bg-emerald-950/80 border border-emerald-600/50 text-emerald-300' : 'bg-emerald-50 border border-emerald-300 text-emerald-800'
          }`}>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Success</span>
          </span>
        );
      case 'error':
        return (
          <span className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs ${
            isDark ? 'bg-rose-950/80 border border-rose-600/50 text-rose-300' : 'bg-rose-50 border border-rose-300 text-rose-800'
          }`}>
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
            <span>Error</span>
          </span>
        );
      default:
        return (
          <span className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs ${
            isDark ? 'bg-slate-800/80 border border-slate-700/60 text-slate-400' : 'bg-slate-100 border border-slate-200 text-slate-600'
          }`}>
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span>Idle</span>
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in zoom-in-95 duration-200">
      <div className={`relative w-full h-full max-w-[96vw] max-h-[94vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border ${
        isDark ? 'bg-[#0e1422] border-slate-700/80' : 'bg-white border-slate-200'
      }`}>
        {/* Top Header Bar */}
        <div className={`flex items-center justify-between px-5 py-3 border-b shrink-0 transition-colors ${
          isDark ? 'bg-[#131b2e] border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className="w-3 h-3 rounded-full bg-sky-500 shadow-md shadow-sky-500/50" />
            {isEditingTitle ? (
              <input
                type="text"
                value={titleInput}
                autoFocus
                onChange={(e) => setTitleInput(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter') handleTitleSubmit();
                }}
                className={`px-2 py-1 rounded text-sm font-bold outline-none w-72 border nodrag nopan nokey ${
                  isDark ? 'bg-slate-900 border-sky-500 text-white' : 'bg-white border-sky-500 text-slate-900'
                }`}
              />
            ) : (
              <h2
                onDoubleClick={() => setIsEditingTitle(true)}
                title="Double click to rename"
                className={`text-base font-bold truncate cursor-pointer transition-colors ${
                  isDark ? 'text-white hover:text-sky-300' : 'text-slate-900 hover:text-sky-600'
                }`}
              >
                {data.title}
              </h2>
            )}

            <span className={`text-xs font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>({maximizedNodeId})</span>

            <div className={`h-4 w-px mx-2 ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`} />

            {getStatusBadge()}

            {data.execution?.executionTimeMs !== undefined && (
              <div className={`flex items-center space-x-1 text-xs px-2.5 py-1 rounded border ${
                isDark ? 'bg-slate-900/80 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-600 shadow-2xs'
              }`}>
                <Clock className="w-3.5 h-3.5 text-sky-500" />
                <span>{data.execution.executionTimeMs} ms</span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {/* Run Node Button */}
            <button
              onClick={() => runNode(maximizedNodeId)}
              disabled={status === 'running'}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run Node (⌘↵)</span>
            </button>

            {/* Minimize / Restore Button */}
            <button
              onClick={() => setMaximizedNodeId(null)}
              title="Minimize (Exit focus mode)"
              className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border cursor-pointer ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-xs'
              }`}
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>Minimize</span>
            </button>

            {/* Close Button */}
            <button
              onClick={() => setMaximizedNodeId(null)}
              title="Close (Esc)"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Variables Header Bar */}
        <div className={`flex items-center justify-between px-5 py-2 border-b text-xs shrink-0 transition-colors ${
          isDark ? 'bg-[#090d16] border-slate-800/80' : 'bg-slate-50 border-slate-200'
        }`}>
          {/* Inputs Section */}
          <div className="flex items-center space-x-2">
            <span className={`font-semibold uppercase text-[11px] tracking-wider ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}>Inputs:</span>
            <div className="flex items-center space-x-1.5 flex-wrap">
              {data.inputs.map((inp) => (
                <span
                  key={inp}
                  className={`flex items-center space-x-1 px-2 py-0.5 rounded font-mono text-[11px] border ${
                    isDark ? 'bg-sky-950/80 border-sky-800/80 text-sky-300' : 'bg-sky-50 border-sky-200 text-sky-700 font-medium'
                  }`}
                >
                  <span>{inp}</span>
                  <button
                    onClick={() => removeNodeInput(maximizedNodeId, inp)}
                    className="text-slate-400 hover:text-rose-500 ml-1 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {showAddInp ? (
                <form onSubmit={handleAddInput} className="flex items-center space-x-1 nodrag nopan nokey">
                  <input
                    type="text"
                    value={newInp}
                    placeholder="var_name"
                    autoFocus
                    onChange={(e) => setNewInp(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    className={`px-2 py-0.5 rounded text-xs outline-none w-28 border nodrag nopan nokey ${
                      isDark ? 'bg-slate-900 border-slate-700 text-sky-300' : 'bg-white border-slate-300 text-sky-700'
                    }`}
                  />
                  <button type="submit" className="px-1.5 py-0.5 bg-sky-600 rounded text-white text-xs cursor-pointer">
                    ✓
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddInp(false)}
                    className={`px-1.5 py-0.5 rounded text-xs cursor-pointer ${
                      isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    ✕
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setShowAddInp(true)}
                  className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                    isDark ? 'bg-slate-800/80 hover:bg-slate-700 text-sky-400' : 'bg-slate-200 hover:bg-slate-300 text-sky-700'
                  }`}
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Input</span>
                </button>
              )}
            </div>
          </div>

          {/* Outputs Section */}
          <div className="flex items-center space-x-2">
            <span className={`font-semibold uppercase text-[11px] tracking-wider ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}>Outputs:</span>
            <div className="flex items-center space-x-1.5 flex-wrap">
              {data.outputs.map((out) => (
                <span
                  key={out}
                  className={`flex items-center space-x-1 px-2 py-0.5 rounded font-mono text-[11px] border ${
                    isDark ? 'bg-emerald-950/80 border-emerald-800/80 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-700 font-medium'
                  }`}
                >
                  <span>{out}</span>
                  <button
                    onClick={() => removeNodeOutput(maximizedNodeId, out)}
                    className="text-slate-400 hover:text-rose-500 ml-1 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {showAddOut ? (
                <form onSubmit={handleAddOutput} className="flex items-center space-x-1 nodrag nopan nokey">
                  <input
                    type="text"
                    value={newOut}
                    placeholder="var_name"
                    autoFocus
                    onChange={(e) => setNewOut(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    className={`px-2 py-0.5 rounded text-xs outline-none w-28 border nodrag nopan nokey ${
                      isDark ? 'bg-slate-900 border-slate-700 text-emerald-300' : 'bg-white border-slate-300 text-emerald-700'
                    }`}
                  />
                  <button type="submit" className="px-1.5 py-0.5 bg-emerald-600 rounded text-white text-xs cursor-pointer">
                    ✓
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddOut(false)}
                    className={`px-1.5 py-0.5 rounded text-xs cursor-pointer ${
                      isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    ✕
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setShowAddOut(true)}
                  className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                    isDark ? 'bg-slate-800/80 hover:bg-slate-700 text-emerald-400' : 'bg-slate-200 hover:bg-slate-300 text-emerald-700'
                  }`}
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Output</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Split Main Content Area */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-0 overflow-hidden">
          {/* Left Panel: Monaco Code Editor */}
          <div className={`flex flex-col border-b lg:border-b-0 lg:border-r overflow-hidden ${
            isDark ? 'border-slate-800 bg-[#1e1e1e]' : 'border-slate-200 bg-white'
          }`}>
            <div className={`px-4 py-2 border-b flex items-center justify-between text-xs ${
              isDark ? 'bg-[#181818] border-slate-800/80 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
            }`}>
              <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>Python Script Editor</span>
              <span className={`text-[11px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Auto-syncs with canvas</span>
            </div>
            <div className="flex-1 w-full h-full relative">
              <Editor
                height="100%"
                language="python"
                theme={isDark ? 'vs-dark' : 'vs'}
                value={data.code}
                onChange={(value) => updateNodeCode(maximizedNodeId, value || '')}
                options={{
                  minimap: { enabled: true },
                  fontSize: 13,
                  fontFamily: "'Fira Code', 'JetBrains Mono', Menlo, monospace",
                  lineNumbers: 'on',
                  glyphMargin: true,
                  folding: true,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 4,
                  renderLineHighlight: 'all',
                }}
              />
            </div>
          </div>

          {/* Right Panel: Full Console & Tabular Data Viewer */}
          <div className={`flex flex-col overflow-hidden ${
            isDark ? 'bg-[#0b0f17]' : 'bg-slate-50'
          }`}>
            <div className={`px-4 py-2 border-b flex items-center justify-between text-xs ${
              isDark ? 'bg-[#0e1422] border-slate-800/80 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
            }`}>
              <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>Output Console & Data Inspector</span>
              <span className={`text-[11px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Live telemetry</span>
            </div>
            <div className="flex-1 overflow-auto">
              <Terminal nodeId={maximizedNodeId} execution={data.execution} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
