import React, { useMemo, useCallback, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type Connection,
  type Edge,
} from '@xyflow/react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { CodeNode } from './CodeNode';
import { CustomEdge } from './CustomEdge';
import { MaximizedNodeModal } from './MaximizedNodeModal';
import { useGraphStore, type CustomNode } from '../store/useGraphStore';

export const Canvas: React.FC = () => {
  const theme = useGraphStore((state) => state.theme);
  const nodes = useGraphStore((state) => state.nodes);
  const edges = useGraphStore((state) => state.edges);
  const onNodesChange = useGraphStore((state) => state.onNodesChange);
  const onEdgesChange = useGraphStore((state) => state.onEdgesChange);
  const onConnect = useGraphStore((state) => state.onConnect);

  const isDark = theme === 'dark';
  const [isTipExpanded, setIsTipExpanded] = useState(false);

  const nodeTypes = useMemo(() => ({ codeNode: CodeNode }), []);
  const edgeTypes = useMemo(() => ({ customEdge: CustomEdge, default: CustomEdge }), []);

  // Prevent circular connections on the fly
  const isValidConnection = useCallback(
    (connection: Connection | Edge) => {
      const source = connection.source;
      const target = connection.target;

      if (!source || !target || source === target) return false;

      // Cycle detection: DFS from target to source
      const hasPath = (src: string, tgt: string, visited = new Set<string>()): boolean => {
        if (src === tgt) return true;
        visited.add(src);
        const outgoing = edges.filter((e) => e.source === src).map((e) => e.target);
        for (const next of outgoing) {
          if (!visited.has(next)) {
            if (hasPath(next, tgt, visited)) return true;
          }
        }
        return false;
      };

      // If a path already exists from target to source, adding (source -> target) creates a cycle
      return !hasPath(target, source);
    },
    [edges]
  );

  return (
    <div className={`relative w-full h-full select-none transition-colors duration-200 ${
      isDark ? 'bg-[#080c14]' : 'bg-slate-50'
    }`}>
      <ReactFlow<CustomNode, Edge>
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        isValidConnection={isValidConnection}
        panActivationKeyCode={null}
        deleteKeyCode={['Backspace', 'Delete']}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.2}
        maxZoom={1.5}
        defaultEdgeOptions={{
          type: 'customEdge',
          animated: true,
          style: { stroke: isDark ? '#0ea5e9' : '#0284c7', strokeWidth: 2.5 },
        }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.5}
          color={isDark ? '#334155' : '#cbd5e1'}
        />
        <Controls
          showInteractive={false}
          className="!bottom-6 !left-6"
        />
        <MiniMap
          nodeStrokeWidth={3}
          nodeColor={isDark ? '#1e293b' : '#94a3b8'}
          maskColor={isDark ? 'rgba(11, 15, 23, 0.75)' : 'rgba(241, 245, 249, 0.85)'}
          className="!bottom-6 !right-6"
        />
      </ReactFlow>

      {/* Maximized Focus Mode Modal */}
      <MaximizedNodeModal />

      {/* Floating Canvas Helper Legend / Tips */}
      <div className="absolute top-4 left-4 z-10">
        {!isTipExpanded ? (
          <button
            onClick={() => setIsTipExpanded(true)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium backdrop-blur-md shadow-lg border transition-all cursor-pointer ${
              isDark
                ? 'bg-slate-900/85 hover:bg-slate-800/90 border-slate-800/80 text-slate-300 hover:text-white'
                : 'bg-white/90 hover:bg-white border-slate-200 text-slate-700 hover:text-slate-900 shadow-slate-200'
            }`}
            title="Show Canvas Tips"
          >
            <span className="text-amber-400">💡</span>
            <span>Canvas Tips</span>
            <ChevronDown className="w-3.5 h-3.5 ml-0.5 text-slate-400" />
          </button>
        ) : (
          <div className={`backdrop-blur-md px-3.5 py-2.5 rounded-xl text-[11px] space-y-1.5 shadow-xl border transition-colors ${
            isDark
              ? 'bg-slate-900/85 border-slate-800/80 text-slate-400'
              : 'bg-white/90 border-slate-200 text-slate-600 shadow-slate-200'
          }`}>
            <div className={`font-semibold flex items-center justify-between space-x-4 ${
              isDark ? 'text-slate-200' : 'text-slate-900'
            }`}>
              <div className="flex items-center space-x-1.5">
                <span className="text-amber-400">💡</span>
                <span>DAG Execution Canvas</span>
              </div>
              <button
                onClick={() => setIsTipExpanded(false)}
                className="p-0.5 text-slate-400 hover:text-slate-200 cursor-pointer rounded transition-colors"
                title="Collapse Tips"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-500" />
                <span>Top/Left: Inputs</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Right/Bottom: Outputs</span>
              </div>
            </div>
            <div className={`text-[10px] pt-0.5 border-t ${
              isDark ? 'text-slate-500 border-slate-800/60' : 'text-slate-400 border-slate-200'
            }`}>
              Click <span className="text-rose-500 font-bold">×</span> on line or press <span className={`font-mono ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Del</span> to remove line. Click ⛶ to maximize node.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
