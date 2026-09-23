'use client';

import React from 'react';
import { Download, RotateCcw, FileText } from 'lucide-react';
import { GenerationResult, SessionInfo } from '../lib/types';

interface DownloadViewProps {
  generationResult: GenerationResult;
  sessionInfo: SessionInfo;
  onReset: () => void;
}

export const DownloadView: React.FC<DownloadViewProps> = ({
  generationResult,
  sessionInfo,
  onReset,
}) => {
  const handleDownload = () => {
    const url = generationResult.downloadUrl;
    if (url === '#' || url.startsWith('/samples/')) {
      const a = document.createElement('a');
      a.href = url.startsWith('/samples/') ? url : '/samples/sample_template.docx';
      a.download = generationResult.filename || 'Executive_Contract_Summary_Filled_Demo.docx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      window.open(url, '_blank');
    }
  };

  const handleDownloadAuditJson = () => {
    const auditData = {
      sessionId: sessionInfo.sessionId,
      sourceDocument: sessionInfo.sourceDoc,
      templateDocument: sessionInfo.templateDoc,
      generatedFile: generationResult.filename,
      timestamp: new Date().toISOString(),
      engine: 'Gemini 2.0 Flash RAG',
    };
    const blob = new Blob([JSON.stringify(auditData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_log_${sessionInfo.sessionId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 py-8">
      {/* Status Header */}
      <div className="space-y-1">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Document Generation Complete
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          Template placeholders populated from {sessionInfo.sourceDoc.filename}.
        </p>
      </div>

      {/* Result Card (Solid, High-Contrast) */}
      <div className="p-5 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-5">
        <div className="flex items-center justify-between p-3.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 font-mono text-xs font-bold uppercase">
              {generationResult.format}
            </div>
            <div>
              <p className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                {generationResult.filename}
              </p>
              <p className="font-mono text-[11px] text-slate-500 uppercase mt-0.5">
                {generationResult.format} Format
              </p>
            </div>
          </div>
          <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950">
            Validated
          </span>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={handleDownload}
            className="px-4 py-2.5 rounded bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Populated Document</span>
          </button>

          <button
            onClick={handleDownloadAuditJson}
            className="px-4 py-2.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>Download Audit Log (JSON)</span>
          </button>
        </div>

        {/* Retention Policy */}
        <div className="text-[11px] text-slate-500 pt-3 border-t border-slate-100 dark:border-slate-800 font-mono">
          Security policy: generated output and temporary uploads expire automatically after 24 hours.
        </div>
      </div>

      {/* Reset */}
      <div>
        <button
          onClick={onReset}
          className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Process another document</span>
        </button>
      </div>
    </div>
  );
};
