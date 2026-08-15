import React, { useState } from 'react';
import { Terminal as TerminalIcon, Table, Database, Copy, Check, AlertCircle, Clock } from 'lucide-react';
import { type NodeExecutionState, useGraphStore } from '../store/useGraphStore';

interface TerminalProps {
  nodeId: string;
  execution: NodeExecutionState;
}

export const Terminal: React.FC<TerminalProps> = ({ nodeId, execution }) => {
  const [copied, setCopied] = useState(false);
  const activeTabByNode = useGraphStore((state) => state.activeTabByNode);
  const setNodeTab = useGraphStore((state) => state.setNodeTab);

  const activeTab = activeTabByNode[nodeId] || (execution.outputsSummary && Object.keys(execution.outputsSummary).length > 0 && execution.outputsSummary[Object.keys(execution.outputsSummary)[0]]?.type === 'DataFrame' ? 'table' : 'console');

  const [selectedDfVar, setSelectedDfVar] = useState<string | null>(null);

  const handleCopyLogs = () => {
    const textToCopy = execution.stdout + (execution.stderr ? `\n\n[STDERR]\n${execution.stderr}` : '');
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const dfVars = Object.entries(execution.outputsSummary || {}).filter(
    ([_, summary]) => summary.type === 'DataFrame' || summary.type === 'Series'
  );

  const activeDfKey = selectedDfVar && execution.outputsSummary?.[selectedDfVar] ? selectedDfVar : (dfVars.length > 0 ? dfVars[0][0] : null);
  const activeDf = activeDfKey ? execution.outputsSummary?.[activeDfKey] : null;

  return (
    <div className="flex flex-col bg-[#0b0f17] border-t border-slate-800 text-xs font-mono select-text">
      {/* Tab Navigation Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#0e1422] border-b border-slate-800/80">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setNodeTab(nodeId, 'console')}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded transition-colors ${
              activeTab === 'console'
                ? 'bg-slate-800 text-sky-400 font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <TerminalIcon className="w-3.5 h-3.5" />
            <span>Console</span>
            {execution.stderr && (
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>

          {dfVars.length > 0 && (
            <button
              onClick={() => setNodeTab(nodeId, 'table')}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded transition-colors ${
                activeTab === 'table'
                  ? 'bg-slate-800 text-emerald-400 font-medium shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Data Table</span>
              <span className="px-1.5 py-0.2 bg-emerald-950 text-emerald-300 rounded text-[10px]">
                {dfVars.length}
              </span>
            </button>
          )}

          {execution.outputsSummary && Object.keys(execution.outputsSummary).length > 0 && (
            <button
              onClick={() => setNodeTab(nodeId, 'variables')}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded transition-colors ${
                activeTab === 'variables'
                  ? 'bg-slate-800 text-purple-400 font-medium shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Variables</span>
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2 text-[11px] text-slate-400">
          {execution.executionTimeMs !== undefined && (
            <div className="flex items-center space-x-1 text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
              <Clock className="w-3 h-3 text-sky-400" />
              <span>{execution.executionTimeMs} ms</span>
            </div>
          )}

          <button
            onClick={handleCopyLogs}
            title="Copy logs"
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Tab Content Body */}
      <div className="p-2.5 max-h-56 overflow-auto leading-relaxed">
        {/* CONSOLE TAB */}
        {activeTab === 'console' && (
          <div className="space-y-1">
            {execution.stdout ? (
              <pre className="text-slate-200 whitespace-pre-wrap font-mono text-[11px] leading-5">
                {execution.stdout}
              </pre>
            ) : null}

            {execution.stderr ? (
              <div className="mt-2 p-2 bg-rose-950/40 border border-rose-900/60 rounded text-rose-300 whitespace-pre-wrap font-mono text-[11px]">
                <div className="flex items-center space-x-1 text-rose-400 font-semibold mb-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Runtime Error</span>
                </div>
                {execution.stderr}
              </div>
            ) : null}

            {!execution.stdout && !execution.stderr && (
              <div className="text-slate-500 italic py-2 text-center">
                {execution.status === 'running'
                  ? 'Executing node...'
                  : execution.status === 'queued'
                  ? 'Queued for execution...'
                  : 'No stdout output emitted.'}
              </div>
            )}
          </div>
        )}

        {/* DATA TABLE TAB */}
        {activeTab === 'table' && activeDf && (
          <div className="space-y-2">
            {/* Variable selector if multiple DataFrames */}
            {dfVars.length > 1 && (
              <div className="flex items-center space-x-2 pb-1">
                <span className="text-slate-400 text-[10px]">Select DataFrame:</span>
                {dfVars.map(([varName, summary]) => (
                  <button
                    key={varName}
                    onClick={() => setSelectedDfVar(varName)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                      activeDfKey === varName
                        ? 'bg-emerald-800 text-emerald-100 font-bold'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {varName} ({summary.shape?.[0]}x{summary.shape?.[1]})
                  </button>
                ))}
              </div>
            )}

            {/* Shape & Columns Info */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1 border-b border-slate-800/80">
              <span className="text-emerald-400 font-medium">
                Variable: <code className="text-slate-200">{activeDfKey}</code>
              </span>
              <span>
                Shape: {activeDf.shape?.[0]} rows × {activeDf.shape?.[1]} cols (Previewing top {activeDf.records?.length || 0})
              </span>
            </div>

            {/* Interactive Data Table */}
            {activeDf.records && activeDf.records.length > 0 ? (
              <div className="overflow-x-auto border border-slate-800 rounded bg-[#090d16]">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-800 text-slate-300 font-semibold">
                      {activeDf.columns?.map((col) => (
                        <th key={col} className="px-2.5 py-1.5 font-mono whitespace-nowrap border-r border-slate-800/60 last:border-r-0">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeDf.records.map((row, idx) => (
                      <tr
                        key={idx}
                        className={`border-b border-slate-800/40 hover:bg-slate-800/40 transition-colors ${
                          idx % 2 === 0 ? 'bg-slate-950/40' : 'bg-transparent'
                        }`}
                      >
                        {activeDf.columns?.map((col) => {
                          const val = row[col];
                          const isNumeric = typeof val === 'number';
                          return (
                            <td
                              key={col}
                              className={`px-2.5 py-1 whitespace-nowrap border-r border-slate-800/40 last:border-r-0 ${
                                isNumeric ? 'text-sky-300 font-mono' : 'text-slate-300'
                              }`}
                            >
                              {val === null || val === undefined ? (
                                <span className="text-slate-600 italic">NaN</span>
                              ) : (
                                String(val)
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-slate-500 italic py-2">Empty DataFrame</div>
            )}
          </div>
        )}

        {/* VARIABLES INSPECTOR TAB */}
        {activeTab === 'variables' && execution.outputsSummary && (
          <div className="space-y-1.5">
            {Object.entries(execution.outputsSummary).map(([varName, summary]) => (
              <div
                key={varName}
                className="p-2 rounded bg-slate-900/80 border border-slate-800/80 flex flex-col space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sky-400">{varName}</span>
                  <span className="px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-300 text-[10px] font-semibold">
                    {summary.type}
                  </span>
                </div>
                <div className="text-slate-300 text-[11px] break-all">
                  {summary.previewText || JSON.stringify(summary)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
