import React, { useState } from 'react';
import { Terminal as TerminalIcon, Table, Database, Copy, Check, AlertCircle, Clock } from 'lucide-react';
import { type NodeExecutionState, useGraphStore } from '../store/useGraphStore';

interface TerminalProps {
  nodeId: string;
  execution: NodeExecutionState;
}

export const Terminal: React.FC<TerminalProps> = ({ nodeId, execution }) => {
  const [copied, setCopied] = useState(false);
  const theme = useGraphStore((state) => state.theme);
  const isDark = theme === 'dark';

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
    <div className={`flex flex-col border-t text-xs font-mono select-text transition-colors ${
      isDark ? 'bg-[#0b0f17] border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
    }`}>
      {/* Tab Navigation Header */}
      <div className={`flex items-center justify-between px-3 py-1.5 border-b transition-colors ${
        isDark ? 'bg-[#0e1422] border-slate-800/80' : 'bg-slate-100/90 border-slate-200'
      }`}>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setNodeTab(nodeId, 'console')}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded transition-colors cursor-pointer ${
              activeTab === 'console'
                ? isDark
                  ? 'bg-slate-800 text-sky-400 font-medium shadow-sm'
                  : 'bg-white text-sky-700 font-semibold shadow-2xs border border-slate-200'
                : isDark
                ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
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
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded transition-colors cursor-pointer ${
                activeTab === 'table'
                  ? isDark
                    ? 'bg-slate-800 text-emerald-400 font-medium shadow-sm'
                    : 'bg-white text-emerald-700 font-semibold shadow-2xs border border-slate-200'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Data Table</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] ${
                isDark ? 'bg-emerald-950 text-emerald-300' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}>
                {dfVars.length}
              </span>
            </button>
          )}

          {execution.outputsSummary && Object.keys(execution.outputsSummary).length > 0 && (
            <button
              onClick={() => setNodeTab(nodeId, 'variables')}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded transition-colors cursor-pointer ${
                activeTab === 'variables'
                  ? isDark
                    ? 'bg-slate-800 text-purple-400 font-medium shadow-sm'
                    : 'bg-white text-purple-700 font-semibold shadow-2xs border border-slate-200'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Variables</span>
            </button>
          )}
        </div>

        <div className={`flex items-center space-x-2 text-[11px] ${
          isDark ? 'text-slate-400' : 'text-slate-500'
        }`}>
          {execution.executionTimeMs !== undefined && (
            <div className={`flex items-center space-x-1 px-2 py-0.5 rounded border ${
              isDark ? 'bg-slate-900/80 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-600 shadow-2xs'
            }`}>
              <Clock className="w-3 h-3 text-sky-500" />
              <span>{execution.executionTimeMs} ms</span>
            </div>
          )}

          <button
            onClick={handleCopyLogs}
            title="Copy logs"
            className={`p-1 rounded transition-colors cursor-pointer ${
              isDark
                ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Tab Content Body */}
      <div className="p-2.5 max-h-56 overflow-auto leading-relaxed">
        {/* CONSOLE TAB */}
        {activeTab === 'console' && (
          <div className="space-y-1">
            {execution.stdout ? (
              <pre className={`whitespace-pre-wrap font-mono text-[11px] leading-5 ${
                isDark ? 'text-slate-200' : 'text-slate-800'
              }`}>
                {execution.stdout}
              </pre>
            ) : null}

            {execution.stderr ? (
              <div className={`mt-2 p-2 border rounded whitespace-pre-wrap font-mono text-[11px] ${
                isDark
                  ? 'bg-rose-950/40 border-rose-900/60 text-rose-300'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                <div className="flex items-center space-x-1 font-semibold mb-1 text-rose-600">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Runtime Error</span>
                </div>
                {execution.stderr}
              </div>
            ) : null}

            {!execution.stdout && !execution.stderr && (
              <div className={`italic py-2 text-center ${
                isDark ? 'text-slate-500' : 'text-slate-400'
              }`}>
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
                <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Select DataFrame:</span>
                {dfVars.map(([varName, summary]) => (
                  <button
                    key={varName}
                    onClick={() => setSelectedDfVar(varName)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer ${
                      activeDfKey === varName
                        ? isDark
                          ? 'bg-emerald-800 text-emerald-100 font-bold'
                          : 'bg-emerald-600 text-white font-bold'
                        : isDark
                        ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    {varName} ({summary.shape?.[0]}x{summary.shape?.[1]})
                  </button>
                ))}
              </div>
            )}

            {/* Shape & Columns Info */}
            <div className={`flex items-center justify-between text-[11px] pb-1 border-b ${
              isDark ? 'text-slate-400 border-slate-800/80' : 'text-slate-500 border-slate-200'
            }`}>
              <span className={isDark ? 'text-emerald-400 font-medium' : 'text-emerald-700 font-semibold'}>
                Variable: <code className={isDark ? 'text-slate-200' : 'text-slate-800 font-bold'}>{activeDfKey}</code>
              </span>
              <span>
                Shape: {activeDf.shape?.[0]} rows × {activeDf.shape?.[1]} cols (Previewing top {activeDf.records?.length || 0})
              </span>
            </div>

            {/* Interactive Data Table */}
            {activeDf.records && activeDf.records.length > 0 ? (
              <div className={`overflow-x-auto border rounded ${
                isDark ? 'border-slate-800 bg-[#090d16]' : 'border-slate-200 bg-white'
              }`}>
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className={`border-b font-semibold ${
                      isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                    }`}>
                      {activeDf.columns?.map((col) => (
                        <th key={col} className={`px-2.5 py-1.5 font-mono whitespace-nowrap border-r last:border-r-0 ${
                          isDark ? 'border-slate-800/60' : 'border-slate-200'
                        }`}>
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeDf.records.map((row, idx) => (
                      <tr
                        key={idx}
                        className={`border-b transition-colors ${
                          isDark
                            ? `border-slate-800/40 hover:bg-slate-800/40 ${idx % 2 === 0 ? 'bg-slate-950/40' : 'bg-transparent'}`
                            : `border-slate-100 hover:bg-slate-50 ${idx % 2 === 0 ? 'bg-slate-50/50' : 'bg-white'}`
                        }`}
                      >
                        {activeDf.columns?.map((col) => {
                          const val = row[col];
                          const isNumeric = typeof val === 'number';
                          return (
                            <td
                              key={col}
                              className={`px-2.5 py-1 whitespace-nowrap border-r last:border-r-0 ${
                                isDark ? 'border-slate-800/40' : 'border-slate-100'
                              } ${
                                isNumeric
                                  ? isDark ? 'text-sky-300 font-mono' : 'text-sky-700 font-mono'
                                  : isDark ? 'text-slate-300' : 'text-slate-700'
                              }`}
                            >
                              {val === null || val === undefined ? (
                                <span className={isDark ? 'text-slate-600 italic' : 'text-slate-400 italic'}>NaN</span>
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
              <div className={`italic py-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Empty DataFrame</div>
            )}
          </div>
        )}

        {/* VARIABLES INSPECTOR TAB */}
        {activeTab === 'variables' && execution.outputsSummary && (
          <div className="space-y-1.5">
            {Object.entries(execution.outputsSummary).map(([varName, summary]) => (
              <div
                key={varName}
                className={`p-2 rounded border flex flex-col space-y-1 ${
                  isDark ? 'bg-slate-900/80 border-slate-800/80' : 'bg-white border-slate-200 shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-bold ${isDark ? 'text-sky-400' : 'text-sky-700'}`}>{varName}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                    isDark ? 'bg-purple-950/80 border-purple-800/80 text-purple-300' : 'bg-purple-50 border-purple-200 text-purple-700'
                  }`}>
                    {summary.type}
                  </span>
                </div>
                <div className={`text-[11px] break-all ${
                  isDark ? 'text-slate-300' : 'text-slate-600'
                }`}>
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
