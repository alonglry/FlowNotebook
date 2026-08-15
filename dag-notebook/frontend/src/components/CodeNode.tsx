import React, { useState, memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Editor from '@monaco-editor/react';
import {
  Play,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Trash2,
  Maximize2
} from 'lucide-react';
import { type CustomNode, useGraphStore } from '../store/useGraphStore';
import { Terminal } from './Terminal';

export const CodeNode = memo(({ id, data, selected }: NodeProps<CustomNode>) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(data.title);
  const [newInp, setNewInp] = useState('');
  const [newOut, setNewOut] = useState('');
  const [showAddInp, setShowAddInp] = useState(false);
  const [showAddOut, setShowAddOut] = useState(false);

  const updateNodeCode = useGraphStore((state) => state.updateNodeCode);
  const updateNodeTitle = useGraphStore((state) => state.updateNodeTitle);
  const addNodeInput = useGraphStore((state) => state.addNodeInput);
  const removeNodeInput = useGraphStore((state) => state.removeNodeInput);
  const addNodeOutput = useGraphStore((state) => state.addNodeOutput);
  const removeNodeOutput = useGraphStore((state) => state.removeNodeOutput);
  const deleteNode = useGraphStore((state) => state.deleteNode);
  const toggleNodeCollapse = useGraphStore((state) => state.toggleNodeCollapse);
  const runNode = useGraphStore((state) => state.runNode);
  const setMaximizedNodeId = useGraphStore((state) => state.setMaximizedNodeId);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (titleInput.trim()) {
      updateNodeTitle(id, titleInput.trim());
    }
  };

  const handleAddInput = (e: React.FormEvent) => {
    e.preventDefault();
    if (newInp.trim()) {
      addNodeInput(id, newInp.trim());
      setNewInp('');
      setShowAddInp(false);
    }
  };

  const handleAddOutput = (e: React.FormEvent) => {
    e.preventDefault();
    if (newOut.trim()) {
      addNodeOutput(id, newOut.trim());
      setNewOut('');
      setShowAddOut(false);
    }
  };

  const status = data.execution?.status || 'idle';

  const getStatusBadge = () => {
    switch (status) {
      case 'running':
        return (
          <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-600/50 text-amber-300 text-[11px] animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
            <span>Running</span>
          </span>
        );
      case 'queued':
        return (
          <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-sky-950/80 border border-sky-600/50 text-sky-300 text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
            <span>Queued</span>
          </span>
        );
      case 'success':
        return (
          <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-600/50 text-emerald-300 text-[11px]">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Success</span>
          </span>
        );
      case 'error':
        return (
          <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-rose-950/80 border border-rose-600/50 text-rose-300 text-[11px]">
            <AlertCircle className="w-3 h-3 text-rose-400" />
            <span>Error</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-400 text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            <span>Idle</span>
          </span>
        );
    }
  };

  return (
    <div
      className={`group relative w-[430px] rounded-xl shadow-2xl transition-all duration-200 border bg-[#111827] text-slate-100 flex flex-col ${
        selected
          ? 'border-sky-500 ring-2 ring-sky-500/30'
          : status === 'error'
          ? 'border-rose-500/80'
          : status === 'running'
          ? 'border-amber-500/80 shadow-amber-500/10'
          : 'border-slate-800 hover:border-slate-700'
      }`}
    >
      {/* ========================================================================= */}
      {/* EXACTLY 4 CONNECTORS: 1 TOP, 1 BOTTOM, 1 LEFT, 1 RIGHT                     */}
      {/* ========================================================================= */}

      {/* Top Connection Handle (Single) */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!w-3.5 !h-3.5 !bg-sky-400 !border-2 !border-[#0e1422] !-top-[7px] node-connector cursor-crosshair z-30"
        title="Top port (Input/Dependency)"
      />

      {/* Bottom Connection Handle (Single) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-3.5 !h-3.5 !bg-emerald-400 !border-2 !border-[#0e1422] !-bottom-[7px] node-connector cursor-crosshair z-30"
        title="Bottom port (Output/Downstream)"
      />

      {/* Left Connection Handle (Single) - Vertically Centered */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!w-3.5 !h-3.5 !bg-sky-400 !border-2 !border-[#0e1422] !-left-[7px] !top-1/2 !-translate-y-1/2 node-connector cursor-crosshair z-30"
        title="Left port (Input)"
      />

      {/* Right Connection Handle (Single) - Vertically Centered */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-3.5 !h-3.5 !bg-emerald-400 !border-2 !border-[#0e1422] !-right-[7px] !top-1/2 !-translate-y-1/2 node-connector cursor-crosshair z-30"
        title="Right port (Output)"
      />

      {/* Node Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#161f30] rounded-t-xl border-b border-slate-800/80">
        <div className="flex items-center space-x-2 flex-1 mr-2 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full bg-sky-500 shrink-0" />
          {isEditingTitle ? (
            <input
              type="text"
              value={titleInput}
              autoFocus
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
              className="px-1.5 py-0.5 bg-slate-900 border border-sky-500 rounded text-xs text-white font-semibold outline-none w-full"
            />
          ) : (
            <span
              onDoubleClick={() => setIsEditingTitle(true)}
              title="Double click to rename"
              className="font-semibold text-xs text-slate-200 truncate cursor-pointer hover:text-sky-300 transition-colors"
            >
              {data.title}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-1.5 shrink-0">
          {getStatusBadge()}

          {/* Run Single Node */}
          <button
            onClick={() => runNode(id)}
            disabled={status === 'running'}
            title="Execute this node and upstream dependencies"
            className="p-1 rounded bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white transition-colors shadow-sm cursor-pointer"
          >
            <Play className="w-3 h-3 fill-current" />
          </button>

          {/* Maximize Node Button */}
          <button
            onClick={() => setMaximizedNodeId(id)}
            title="Maximize Node (Focus Mode)"
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-sky-300 transition-colors cursor-pointer"
          >
            <Maximize2 className="w-3 h-3" />
          </button>

          {/* Collapse/Expand Node */}
          <button
            onClick={() => toggleNodeCollapse(id)}
            title={data.isCollapsed ? 'Expand node' : 'Collapse node'}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
          >
            {data.isCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </button>

          {/* Delete Node */}
          <button
            onClick={() => deleteNode(id)}
            title="Delete node"
            className="p-1 rounded bg-slate-800 hover:bg-rose-900/60 hover:text-rose-300 text-slate-400 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Main Node Body (Expandable) */}
      {!data.isCollapsed && (
        <div className="flex flex-col">
          {/* Handles & Variables Bar */}
          <div className="grid grid-cols-2 gap-2 px-3 py-2 bg-[#0d131f] border-b border-slate-800/80 text-[11px]">
            {/* Inputs Column */}
            <div className="flex flex-col space-y-1.5">
              <div className="flex items-center justify-between text-slate-400 font-medium">
                <span className="text-[10px] uppercase tracking-wider text-slate-400">Inputs</span>
                <button
                  onClick={() => setShowAddInp(!showAddInp)}
                  className="p-0.5 rounded hover:bg-slate-800 text-sky-400 transition-colors cursor-pointer"
                  title="Add input variable name"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              {showAddInp && (
                <form onSubmit={handleAddInput} className="flex items-center space-x-1">
                  <input
                    type="text"
                    value={newInp}
                    placeholder="var_name"
                    autoFocus
                    onChange={(e) => setNewInp(e.target.value)}
                    className="w-full px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-[10px] text-sky-300 outline-none"
                  />
                  <button type="submit" className="p-0.5 bg-sky-600 rounded text-white text-[10px] cursor-pointer">
                    ✓
                  </button>
                </form>
              )}

              <div className="flex flex-wrap gap-1">
                {data.inputs.map((inp) => (
                  <div
                    key={inp}
                    className="flex items-center space-x-1 bg-slate-900/90 border border-slate-800 px-2 py-0.5 rounded font-mono text-sky-300 text-[10px]"
                  >
                    <span>{inp}</span>
                    <button
                      onClick={() => removeNodeInput(id, inp)}
                      className="text-slate-500 hover:text-rose-400 transition-colors ml-0.5 cursor-pointer"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
                {data.inputs.length === 0 && !showAddInp && (
                  <span className="text-slate-500 italic text-[10px]">No inputs (Source)</span>
                )}
              </div>
            </div>

            {/* Outputs Column */}
            <div className="flex flex-col space-y-1.5 text-right">
              <div className="flex items-center justify-between text-slate-400 font-medium flex-row-reverse">
                <span className="text-[10px] uppercase tracking-wider text-slate-400">Outputs</span>
                <button
                  onClick={() => setShowAddOut(!showAddOut)}
                  className="p-0.5 rounded hover:bg-slate-800 text-emerald-400 transition-colors cursor-pointer"
                  title="Add output variable name"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              {showAddOut && (
                <form onSubmit={handleAddOutput} className="flex items-center space-x-1">
                  <button type="submit" className="p-0.5 bg-emerald-600 rounded text-white text-[10px] cursor-pointer">
                    ✓
                  </button>
                  <input
                    type="text"
                    value={newOut}
                    placeholder="var_name"
                    autoFocus
                    onChange={(e) => setNewOut(e.target.value)}
                    className="w-full px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-[10px] text-emerald-300 outline-none text-right"
                  />
                </form>
              )}

              <div className="flex flex-wrap justify-end gap-1">
                {data.outputs.map((out) => (
                  <div
                    key={out}
                    className="flex items-center space-x-1 bg-slate-900/90 border border-slate-800 px-2 py-0.5 rounded font-mono text-emerald-300 text-[10px]"
                  >
                    <span>{out}</span>
                    <button
                      onClick={() => removeNodeOutput(id, out)}
                      className="text-slate-500 hover:text-rose-400 transition-colors ml-0.5 cursor-pointer"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
                {data.outputs.length === 0 && !showAddOut && (
                  <span className="text-slate-500 italic text-[10px]">No outputs (Sink)</span>
                )}
              </div>
            </div>
          </div>

          {/* Monaco Editor Container */}
          <div className="h-48 border-b border-slate-800/80 bg-[#1e1e1e]">
            <Editor
              height="100%"
              language="python"
              theme="vs-dark"
              value={data.code}
              onChange={(value) => updateNodeCode(id, value || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 12,
                fontFamily: "'Fira Code', 'JetBrains Mono', Menlo, monospace",
                lineNumbers: 'on',
                glyphMargin: false,
                folding: false,
                lineDecorationsWidth: 4,
                lineNumbersMinChars: 2,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 4,
                renderLineHighlight: 'all',
                suggest: {
                  showWords: false,
                },
              }}
            />
          </div>

          {/* Collapsible Console Pane / Terminal */}
          <Terminal nodeId={id} execution={data.execution} />
        </div>
      )}
    </div>
  );
});

CodeNode.displayName = 'CodeNode';
