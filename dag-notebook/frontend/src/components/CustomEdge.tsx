import React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';
import { X } from 'lucide-react';
import { useGraphStore } from '../store/useGraphStore';

export const CustomEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected,
}) => {
  const deleteEdge = useGraphStore((state) => state.deleteEdge);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteEdge(id);
  };

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: selected ? '#38bdf8' : '#0ea5e9',
          strokeWidth: selected ? 3.5 : 2.5,
          transition: 'stroke 0.2s, stroke-width 0.2s',
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan group flex items-center justify-center"
        >
          <button
            onClick={handleDelete}
            title="Delete connection (or press Backspace/Delete)"
            className={`flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer shadow-lg border ${
              selected
                ? 'w-6 h-6 bg-rose-600 text-white border-rose-400 scale-110 ring-2 ring-rose-500/50'
                : 'w-5 h-5 bg-[#0e1422]/90 text-slate-400 border-slate-700 hover:w-6 hover:h-6 hover:bg-rose-600 hover:text-white hover:border-rose-400 hover:scale-110'
            }`}
          >
            <X className="w-3 h-3 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};
