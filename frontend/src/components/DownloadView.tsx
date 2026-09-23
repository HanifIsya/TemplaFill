'use client';

import React from 'react';
import {
  CheckCircle,
  Download,
  FileText,
  FileSpreadsheet,
  Presentation,
  RotateCcw,
  FileCode,
  ShieldCheck,
} from 'lucide-react';
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
  const getFormatIcon = (format: string) => {
    switch (format.toLowerCase()) {
      case 'xlsx':
      case 'xls':
        return <FileSpreadsheet className="w-8 h-8 text-emerald-500" />;
      case 'pptx':
      case 'ppt':
        return <Presentation className="w-8 h-8 text-orange-500" />;
      default:
        return <FileText className="w-8 h-8 text-indigo-500" />;
    }
  };

  const handleDownload = () => {
    // In mock mode or real mode: create simulated download blob if mock
    if (generationResult.downloadUrl === '#') {
      const blob = new Blob([
        `TemplaFill Generated Output\nSession: ${sessionInfo.sessionId}\nDate: ${new Date().toISOString()}`
      ], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = generationResult.filename;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      window.open(generationResult.downloadUrl, '_blank');
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
    <div className="w-full max-w-3xl mx-auto space-y-8 py-10">
      {/* Success Badge */}
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <CheckCircle className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          Template Filled Successfully!
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm max-w-md mx-auto">
          All extracted fields from <span className="font-semibold text-slate-800 dark:text-slate-200">{sessionInfo.sourceDoc.filename}</span> have been placed into your template.
        </p>
      </div>

      {/* Result Card */}
      <div className="p-6 rounded-2xl glass-panel shadow-md space-y-6">
        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm">
              {getFormatIcon(generationResult.format)}
            </div>
            <div>
              <p className="font-bold text-sm text-slate-800 dark:text-slate-200">
                {generationResult.filename}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">
                {generationResult.format} Format • Ready to download
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            Validated
          </span>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={handleDownload}
            className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 shadow-md shadow-indigo-500/25 hover:scale-[1.02] transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download Filled Document</span>
          </button>

          <button
            onClick={handleDownloadAuditJson}
            className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-medium text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 shadow-sm transition-all cursor-pointer"
          >
            <FileCode className="w-4 h-4 text-slate-400" />
            <span>Download Audit Trail (JSON)</span>
          </button>
        </div>

        {/* Security & Cleanup notice */}
        <div className="flex items-center gap-2 p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 text-xs">
          <ShieldCheck className="w-4 h-4 shrink-0 text-indigo-500" />
          <span>
            Security guarantee: uploaded and generated files are automatically deleted after 24 hours.
          </span>
        </div>
      </div>

      {/* Restart */}
      <div className="text-center pt-2">
        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Process another document</span>
        </button>
      </div>
    </div>
  );
};
