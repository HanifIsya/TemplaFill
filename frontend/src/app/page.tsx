'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { HeroLanding } from '../components/HeroLanding';
import { DualDropzone } from '../components/DualDropzone';
import { ProcessingView } from '../components/ProcessingView';
import { ReviewMappingView } from '../components/ReviewMappingView';
import { DownloadView } from '../components/DownloadView';
import { ToastContainer } from '../components/Toast';
import { HistoryModal } from '../components/HistoryModal';
import {
  WorkflowStep,
  SessionInfo,
  JobProgress,
  ExtractionResult,
  GenerationResult,
  ToastMessage,
  RecentSession,
} from '../lib/types';
import { api } from '../lib/api';
import { MOCK_DEMO_SESSION } from '../lib/mockData';

const STORAGE_KEY_SESSIONS = 'templafill_recent_sessions';

export default function Home() {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('landing');
  const [isDark, setIsDark] = useState<boolean>(false);
  const [isBackendLive, setIsBackendLive] = useState<boolean>(false);

  // Uploaded files
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [templateFile, setTemplateFile] = useState<File | null>(null);

  // Active Session and Extraction Data
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [progress, setProgress] = useState<JobProgress>({
    jobId: '',
    sessionId: '',
    status: 'pending',
    progressPercent: 0,
    currentStep: 'Initializing...',
    fieldsProcessed: 0,
    totalFields: 8,
  });
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Toast notifications state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // History sessions state with lazy initializer
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_SESSIONS);
        if (saved) return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return [];
  });

  // Toast dispatcher helper
  const addToast = useCallback((type: ToastMessage['type'], title: string, message: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Dark mode effect sync
  useEffect(() => {
    const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isSystemDark) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Check backend health on mount
  useEffect(() => {
    api.checkHealth().then((res) => {
      setIsBackendLive(res.isLive);
      if (res.isLive) {
        addToast('success', 'Backend Connected', `Connected to FastAPI server v${res.version}`);
      }
    });
  }, [addToast]);

  const handleToggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  };

  // Load demo preset files
  const handleLoadDemoFiles = () => {
    const demoSource = new File(
      ['%PDF-1.4 simulated binary contract content with 14 pages'],
      'Master_Services_Agreement_2026.pdf',
      { type: 'application/pdf' }
    );
    const demoTemplate = new File(
      ['simulated docx binary template file with mustache bookmarks'],
      'Executive_Contract_Summary_Template.docx',
      {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }
    );
    setSourceFile(demoSource);
    setTemplateFile(demoTemplate);
    addToast(
      'info',
      'Demo Preset Loaded',
      'Sample Legal Agreement (PDF) and Word Template (.docx) loaded.'
    );
  };

  // Start extraction workflow
  const handleStartExtraction = async () => {
    if (!sourceFile || !templateFile) return;

    setIsProcessing(true);
    setCurrentStep('processing');
    addToast('info', 'AI Pipeline Started', 'Parsing text and computing semantic embeddings...');

    try {
      // 1. Upload files
      const session = await api.uploadFiles(sourceFile, templateFile);
      setSessionInfo(session);

      // 2. Start extraction job
      const { jobId } = await api.startExtraction(session.sessionId);

      // 3. Simulate or poll progress
      let currentProgress = 10;
      setProgress({
        jobId,
        sessionId: session.sessionId,
        status: 'extracting',
        progressPercent: currentProgress,
        currentStep: '1/4: Parsing and OCR on Source PDF...',
        fieldsProcessed: 1,
        totalFields: 8,
      });

      const interval = setInterval(async () => {
        currentProgress += 25;
        const updated = await api.getJobProgress(jobId, currentProgress);
        setProgress(updated);

        if (updated.progressPercent >= 100) {
          clearInterval(interval);
          // Fetch results
          const result = await api.getFieldMappings(session.sessionId);
          setExtractionResult(result);
          setIsProcessing(false);
          setCurrentStep('review');
          addToast(
            'success',
            'Extraction Complete',
            `Found ${result.totalFields} fields with ${result.highConfidenceCount} high confidence.`
          );
        }
      }, 650);
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
      addToast('error', 'Processing Error', 'Failed to complete document extraction.');
      setCurrentStep('upload');
    }
  };

  // Update field value in review
  const handleUpdateField = async (fieldId: string, newValue: string) => {
    if (!sessionInfo) return;
    await api.updateField(sessionInfo.sessionId, fieldId, newValue);
    addToast('success', 'Field Updated', 'Extracted value adjusted manually.');
  };

  // Confirm fields and generate final template
  const handleConfirmAndGenerate = async (confirmedFields: Record<string, string>) => {
    if (!sessionInfo) return;
    setIsGenerating(true);
    addToast('info', 'Generating Output', 'Filling template placeholders and preserving format...');

    try {
      const res = await api.generateDocument(sessionInfo.sessionId, confirmedFields);
      setGenerationResult(res);
      setIsGenerating(false);
      setCurrentStep('download');

      // Save to recent sessions in localStorage
      const newSession: RecentSession = {
        sessionId: sessionInfo.sessionId,
        sourceFilename: sessionInfo.sourceDoc.filename,
        templateFilename: sessionInfo.templateDoc.filename,
        date: new Date().toISOString(),
        fieldCount: Object.keys(confirmedFields).length,
        downloadFilename: res.filename,
      };

      setRecentSessions((prev) => {
        const updated = [newSession, ...prev.filter((s) => s.sessionId !== newSession.sessionId)];
        try {
          localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(updated));
        } catch {
          // ignore
        }
        return updated;
      });

      addToast(
        'success',
        'Document Ready',
        `${res.filename} generated successfully and ready to download.`
      );
    } catch (err) {
      console.error(err);
      setIsGenerating(false);
      addToast('error', 'Generation Error', 'Failed to generate filled template document.');
    }
  };

  // Clear history
  const handleClearHistory = () => {
    setRecentSessions([]);
    localStorage.removeItem(STORAGE_KEY_SESSIONS);
    addToast('info', 'History Cleared', 'All local session records removed.');
  };

  // Download past session file
  const handleDownloadSessionFile = (session: RecentSession) => {
    const blob = new Blob([
      `TemplaFill Restored Output\nSession: ${session.sessionId}\nDate: ${session.date}`
    ], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = session.downloadFilename;
    a.click();
    URL.revokeObjectURL(url);
    addToast('success', 'Downloaded', `Saved ${session.downloadFilename}`);
  };

  // Reset to initial state
  const handleReset = () => {
    setSourceFile(null);
    setTemplateFile(null);
    setSessionInfo(null);
    setExtractionResult(null);
    setGenerationResult(null);
    setCurrentStep('upload');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors bg-grid-pattern">
      <Navbar
        currentStep={currentStep}
        onNavigateStep={setCurrentStep}
        isBackendLive={isBackendLive}
        onToggleTheme={handleToggleTheme}
        isDark={isDark}
        onOpenHistory={() => setIsHistoryOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 flex flex-col justify-center">
        {currentStep === 'landing' && (
          <HeroLanding
            onGetStarted={() => setCurrentStep('upload')}
            onTryDemo={() => {
              handleLoadDemoFiles();
              setCurrentStep('upload');
            }}
          />
        )}

        {currentStep === 'upload' && (
          <DualDropzone
            sourceFile={sourceFile}
            templateFile={templateFile}
            onSetSourceFile={(f) => {
              setSourceFile(f);
              if (f) addToast('info', 'Source File Added', f.name);
            }}
            onSetTemplateFile={(f) => {
              setTemplateFile(f);
              if (f) addToast('info', 'Template Added', f.name);
            }}
            onStartExtraction={handleStartExtraction}
            onLoadDemoFiles={handleLoadDemoFiles}
            isLoading={isProcessing}
          />
        )}

        {currentStep === 'processing' && (
          <ProcessingView
            progress={progress}
            sourceFilename={sourceFile?.name || 'Source.pdf'}
            templateFilename={templateFile?.name || 'Template.docx'}
          />
        )}

        {currentStep === 'review' && extractionResult && (
          <ReviewMappingView
            extractionResult={extractionResult}
            onConfirmAndGenerate={handleConfirmAndGenerate}
            onUpdateField={handleUpdateField}
            onReExtractField={async (fieldId, hint) => {
              addToast(
                'info',
                'AI Re-extraction',
                `Prompting Gemini with hint: "${hint || 'Context refinement'}"`
              );
            }}
            isGenerating={isGenerating}
          />
        )}

        {currentStep === 'download' && generationResult && (
          <DownloadView
            generationResult={generationResult}
            sessionInfo={sessionInfo || MOCK_DEMO_SESSION}
            onReset={handleReset}
          />
        )}
      </main>

      <Footer />

      {/* Global Toast Notifications Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Recent Sessions History Modal */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        sessions={recentSessions}
        onClearHistory={handleClearHistory}
        onDownloadSessionFile={handleDownloadSessionFile}
      />
    </div>
  );
}
