import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { X, Copy, Check, Download, FileCode2 } from 'lucide-react';
import { useGraphStore } from '../store/useGraphStore';

export const ExportModal: React.FC = () => {
  const theme = useGraphStore((state) => state.theme);
  const isDark = theme === 'dark';

  const isExportModalOpen = useGraphStore((state) => state.isExportModalOpen);
  const setIsExportModalOpen = useGraphStore((state) => state.setIsExportModalOpen);
  const standaloneScript = useGraphStore((state) => state.standaloneScript);
  const [copied, setCopied] = useState(false);

  if (!isExportModalOpen || !standaloneScript) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(standaloneScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([standaloneScript], { type: 'text/x-python;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'dag_pipeline_standalone.py');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-6 animate-in fade-in duration-200">
      <div className={`relative w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border ${
        isDark ? 'bg-[#0e1422] border-slate-700/80' : 'bg-white border-slate-200'
      }`}>
        {/* Modal Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b transition-colors ${
          isDark ? 'bg-[#141b2d] border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg border ${
              isDark ? 'bg-sky-950 text-sky-400 border-sky-800' : 'bg-sky-50 text-sky-700 border-sky-200'
            }`}>
              <FileCode2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Export Standalone Python Script
              </h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Modular, topologically sorted script ready for command-line execution or backtesting.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border cursor-pointer ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-xs'
              }`}
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy Script'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium rounded-lg transition-colors shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download .py</span>
            </button>

            <button
              onClick={() => setIsExportModalOpen(false)}
              className={`p-1.5 rounded-lg transition-colors ml-2 cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Editor Body */}
        <div className={`flex-1 p-2 ${isDark ? 'bg-[#1e1e1e]' : 'bg-white'}`}>
          <Editor
            height="100%"
            language="python"
            theme={isDark ? 'vs-dark' : 'vs'}
            value={standaloneScript}
            options={{
              readOnly: true,
              fontSize: 13,
              fontFamily: "'Fira Code', 'JetBrains Mono', Menlo, monospace",
              lineNumbers: 'on',
              minimap: { enabled: true },
              automaticLayout: true,
              scrollBeyondLastLine: false,
            }}
          />
        </div>

        {/* Modal Footer */}
        <div className={`flex items-center justify-between px-6 py-3 border-t text-xs transition-colors ${
          isDark ? 'bg-[#111827] border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
        }`}>
          <span>
            Run via CLI: <code className={`font-mono px-2 py-0.5 rounded border ${
              isDark ? 'text-sky-300 bg-slate-900 border-slate-800' : 'text-sky-700 bg-white border-slate-200'
            }`}>python dag_pipeline_standalone.py</code>
          </span>
          <button
            onClick={() => setIsExportModalOpen(false)}
            className={`px-4 py-1.5 rounded-lg transition-colors cursor-pointer border ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-xs'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
