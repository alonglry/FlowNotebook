import React, { useState } from 'react';
import { X, Shield, FileText, Lock, ExternalLink, Sparkles } from 'lucide-react';
import { useGraphStore } from '../store/useGraphStore';

export type LegalTab = 'terms' | 'privacy';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: LegalTab;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'terms'
}) => {
  const theme = useGraphStore((state) => state.theme);
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl border transition-colors ${
          isDark
            ? 'bg-[#0b1324] border-slate-700/80 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900 shadow-slate-300'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            isDark ? 'border-slate-800 bg-[#0e172e]' : 'border-slate-100 bg-slate-50'
          } rounded-t-2xl`}
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">FlowNotebook Legal & Privacy</h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Last updated: August 2026 • Governing Terms & Data Policies
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              isDark
                ? 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-400 hover:text-slate-200'
                : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-800 shadow-xs'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div
          className={`flex items-center space-x-2 px-6 pt-3 border-b text-sm font-semibold ${
            isDark ? 'border-slate-800 bg-[#090e1c]' : 'border-slate-100 bg-slate-50/50'
          }`}
        >
          <button
            onClick={() => setActiveTab('terms')}
            className={`pb-3 px-3 flex items-center space-x-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'terms'
                ? 'border-sky-500 text-sky-400 font-bold'
                : isDark
                ? 'border-transparent text-slate-400 hover:text-slate-200'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Terms of Service</span>
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`pb-3 px-3 flex items-center space-x-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'privacy'
                ? 'border-sky-500 text-sky-400 font-bold'
                : isDark
                ? 'border-transparent text-slate-400 hover:text-slate-200'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Privacy Policy</span>
          </button>
        </div>

        {/* Content Body */}
        <div
          className={`flex-1 overflow-y-auto px-6 py-6 text-sm leading-relaxed space-y-6 ${
            isDark ? 'text-slate-300' : 'text-slate-700'
          }`}
        >
          {activeTab === 'terms' ? (
            <div className="space-y-6">
              <section className="space-y-2">
                <h3 className={`text-base font-bold flex items-center space-x-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <span>1. Acceptance of Terms</span>
                </h3>
                <p>
                  By accessing or using <strong>FlowNotebook</strong> ("the Service", "we", "us", or "our"), 
                  you agree to be bound by these Terms of Service. If you do not agree to these terms, 
                  please do not access or use the Service.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className={`text-base font-bold flex items-center space-x-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <span>2. Description of the Service</span>
                </h3>
                <p>
                  FlowNotebook is a visual, graph-based interactive Python computational notebook platform. 
                  It provides 2D DAG canvas workflows, live topological code execution, variable inspection, 
                  and cloud storage synchronization with Google Drive.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className={`text-base font-bold flex items-center space-x-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <span>3. Acceptable Use Policy & Resource Limits</span>
                </h3>
                <p>
                  You agree to use FlowNotebook only for lawful research, education, data science, and development purposes. 
                  You strictly agree NOT to:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Use the execution environment for cryptocurrency mining, denial-of-service (DoS) attacks, port scanning, or malicious network probing.</li>
                  <li>Attempt to bypass sandbox security, read internal host infrastructure credentials, or execute destructive root-level OS operations.</li>
                  <li>Deploy automated bots or stress-testing scripts designed to degrade service availability for other users.</li>
                  <li>Upload, execute, or distribute malware, viruses, or harmful payloads.</li>
                </ul>
                <p className="text-xs text-amber-500 font-medium">
                  We reserve the right to immediately terminate or rate-limit accounts that violate this Acceptable Use Policy.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className={`text-base font-bold flex items-center space-x-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <span>4. Python Code Execution Disclaimer</span>
                </h3>
                <p>
                  Code is executed in ephemeral, isolated runtime environments with defensive variable copies and automated execution timeouts (15s per node). 
                  FlowNotebook does not guarantee persistent in-memory execution state across server restarts. Users are advised to save their DAG projects to Google Drive or local storage.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className={`text-base font-bold flex items-center space-x-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <span>5. Open Source Licensing & Intellectual Property</span>
                </h3>
                <p>
                  The FlowNotebook core engine and open-source packages are licensed under the permissive <strong>MIT License</strong>. 
                  You retain full ownership and intellectual property rights over any Python scripts, formulas, workflows, or datasets you create in FlowNotebook.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className={`text-base font-bold flex items-center space-x-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <span>6. Disclaimer of Warranties & Limitation of Liability</span>
                </h3>
                <p>
                  THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. 
                  IN NO EVENT SHALL THE AUTHORS, MAINTAINERS, OR HOSTS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING OUT OF THE USE OR INABILITY TO USE THE SERVICE.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className={`text-base font-bold flex items-center space-x-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <span>7. Contact & Inquiries</span>
                </h3>
                <p>
                  For any legal questions regarding these Terms, please contact: <code className="px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 font-mono text-xs">flownotebook.support@gmail.com</code>.
                </p>
              </section>
            </div>
          ) : (
            <div className="space-y-6">
              <section className="space-y-2">
                <h3 className={`text-base font-bold flex items-center space-x-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <span>1. Overview & Privacy Commitment</span>
                </h3>
                <p>
                  Your privacy is fundamental to FlowNotebook. This Privacy Policy outlines what information is collected when you use FlowNotebook and how your data is protected.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className={`text-base font-bold flex items-center space-x-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <span>2. Information We Collect</span>
                </h3>
                <p>When you use FlowNotebook, we may collect the following limited information:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Google Account Information:</strong> When signing in via Google OAuth, we receive your email address, display name, and profile picture URL to authenticate you.</li>
                  <li><strong>Notebook Workflow Data:</strong> Graph structures, node code, and layout coordinates that you choose to save to your personal Google Drive or local storage.</li>
                  <li><strong>Anonymous Telemetry & Usage Logs:</strong> Basic aggregate execution counts and error statuses to monitor system health and optimize performance.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className={`text-base font-bold flex items-center space-x-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <span>3. Google Drive Integration & Zero Data Selling</span>
                </h3>
                <p>
                  FlowNotebook uses Google Drive API scopes strictly to read and write your FlowNotebook files in your private Drive folder. 
                  <strong> We never sell, monetize, or rent your personal information, code, or datasets to third parties or advertisers.</strong>
                </p>
              </section>

              <section className="space-y-2">
                <h3 className={`text-base font-bold flex items-center space-x-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <span>4. Data Storage & Security</span>
                </h3>
                <p>
                  User session data is stored securely using encrypted HTTPS/WSS protocols. Ephemeral execution namespaces are purged after node completion. 
                  Administrative telemetry is protected behind strict authentication.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className={`text-base font-bold flex items-center space-x-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <span>5. User Rights & Account Deletion (GDPR & CCPA)</span>
                </h3>
                <p>
                  You have the right to access, export, or delete your data at any time. You can revoke FlowNotebook's Google permissions directly via your 
                  <a 
                    href="https://myaccount.google.com/permissions" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-sky-400 hover:underline inline-flex items-center space-x-1 ml-1"
                  >
                    <span>Google Account Permissions</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>.
                  To request complete deletion of telemetry logs associated with your account, email <code className="px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 font-mono text-xs">flownotebook.support@gmail.com</code>.
                </p>
              </section>


              <section className="space-y-2">
                <h3 className={`text-base font-bold flex items-center space-x-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <span>6. Policy Updates</span>
                </h3>
                <p>
                  We may periodically update this Privacy Policy. Any material changes will be reflected with a revised "Last updated" date at the top of this document.
                </p>
              </section>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-t ${
            isDark ? 'border-slate-800 bg-[#0e172e]' : 'border-slate-100 bg-slate-50'
          } rounded-b-2xl`}
        >
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>FlowNotebook • Visual DAG Execution Platform</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white transition-all shadow-md cursor-pointer"
          >
            I Understand & Accept
          </button>
        </div>
      </div>
    </div>
  );
};
