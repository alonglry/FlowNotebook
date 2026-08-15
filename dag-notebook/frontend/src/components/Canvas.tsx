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
  const nodes = useGraphStore((state) => state.nodes);
  const edges = useGraphStore((state) => state.edges);
  const onNodesChange = useGraphStore((state) => state.onNodesChange);
  const onEdgesChange = useGraphStore((state) => state.onEdgesChange);
  const onConnect = useGraphStore((state) => state.onConnect);

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
    <div className="relative w-full h-full bg-[#080c14] select-none">
      <ReactFlow<CustomNode, Edge>
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        isValidConnection={isValidConnection}
        deleteKeyCode={['Backspace', 'Delete']}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.2}
        maxZoom={1.5}
        defaultEdgeOptions={{
          type: 'customEdge',
          animated: true,
          style: { stroke: '#0ea5e9', strokeWidth: 2.5 },
        }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.5}
          color="#334155"
        />
        <Controls
          showInteractive={false}
          className="!bottom-6 !left-6"
        />
        <MiniMap
          nodeStrokeWidth={3}
          nodeColor="#1e293b"
          maskColor="rgba(11, 15, 23, 0.75)"
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
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900/85 hover:bg-slate-800/90 backdrop-blur-md border border-slate-800/80 rounded-xl text-xs font-medium text-slate-300 hover:text-white shadow-lg transition-all cursor-pointer"
            title="Show Canvas Tips"
          >
            <span className="text-amber-400">💡</span>
            <span>Canvas Tips</span>
            <ChevronDown className="w-3.5 h-3.5 ml-0.5 text-slate-400" />
          </button>
        ) : (
          <div className="bg-slate-900/85 backdrop-blur-md border border-slate-800/80 px-3.5 py-2.5 rounded-xl text-[11px] text-slate-400 space-y-1.5 shadow-xl transition-colors">
            <div className="font-semibold text-slate-200 flex items-center justify-between space-x-4">
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
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-slate-400">
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                <span>Top/Left: Inputs</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Right/Bottom: Outputs</span>
              </div>
            </div>
            <div className="text-[10px] text-slate-500 pt-0.5 border-t border-slate-800/60">
              Click <span className="text-rose-400 font-bold">×</span> on line or press <span className="text-slate-300 font-mono">Del</span> to remove line. Click ⛶ to maximize node.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
