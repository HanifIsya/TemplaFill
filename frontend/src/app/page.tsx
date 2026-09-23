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
import { AuthModal } from '../components/AuthModal';
import { HelpModal } from '../components/HelpModal';
import { BackendWakingBanner } from '../components/BackendWakingBanner';
import {
  WorkflowStep,
  SessionInfo,
  JobProgress,
  ExtractionResult,
  GenerationResult,
  ToastMessage,
  RecentSession,
  UserAccount,
} from '../lib/types';
import { api } from '../lib/api';
import { MOCK_DEMO_SESSION } from '../lib/mockData';

const STORAGE_KEY_SESSIONS = 'templafill_recent_sessions';

export default function Home() {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('landing');
  const [isDark, setIsDark] = useState<boolean>(false);
  const [isBackendLive, setIsBackendLive] = useState<boolean>(false);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'waking' | 'live' | 'offline' | 'mock'>('checking');
  const [wakeRetries, setWakeRetries] = useState<number>(0);

  // Authentication & User Session
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [user, setUser] = useState<UserAccount | null>(() => {
    return api.getStoredUser() || api.getAnonymousUser();
  });

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

  // Check backend health on mount — with Render Hobby cold-start handling (sleep 15 min, wake ~60s)
  const checkBackend = useCallback(async () => {
    setBackendStatus('checking');
    const res = await api.checkHealth({ timeoutMs: 7000 });
    if (res.isLive) {
      setIsBackendLive(true);
      setBackendStatus('live');
      setWakeRetries(0);
      addToast('success', 'Backend Connected', `Connected to FastAPI server v${res.version}`);
      return;
    }
    if (res.isWaking) {
      setIsBackendLive(false);
      setBackendStatus('waking');
      addToast('info', 'Backend is waking up', 'Render Hobby sleeps after 15 min idle — cold start ~60s. Polling…');
      // Poll for up to 12×5s = 60s
      for (let i = 1; i <= 12; i++) {
        setWakeRetries(i);
        await new Promise((r) => setTimeout(r, 5000));
        const retry = await api.checkHealth({ timeoutMs: 8000 });
        if (retry.isLive) {
          setIsBackendLive(true);
          setBackendStatus('live');
          setWakeRetries(0);
          addToast('success', 'Backend Live', `Woke after ${i * 5}s — v${retry.version}`);
          return;
        }
      }
      setBackendStatus('offline');
      addToast('error', 'Backend still offline', 'Render may still be booting or quota exceeded (750h/mo Hobby). You can still try mock demo mode.');
      return;
    }
    // Mock/offline
    setIsBackendLive(false);
    setBackendStatus('mock');
  }, [addToast]);

  useEffect(() => {
    checkBackend();
  }, [checkBackend]);

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
  const handleLoadDemoFiles = async () => {
    try {
      const [contractRes, templateRes] = await Promise.all([
        fetch('/samples/sample_contract.pdf'),
        fetch('/samples/sample_template.docx'),
      ]);

      if (contractRes.ok && templateRes.ok) {
        const contractBlob = await contractRes.blob();
        const templateBlob = await templateRes.blob();
        const demoSource = new File([contractBlob], 'Master_Services_Agreement_2026.pdf', {
          type: 'application/pdf',
        });
        const demoTemplate = new File(
          [templateBlob],
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
          `Sample Legal Agreement (${(demoSource.size / 1024).toFixed(1)} KB) and Word Template (${(demoTemplate.size / 1024).toFixed(1)} KB) loaded.`
        );
        return;
      }
    } catch (e) {
      console.warn('Could not fetch sample files from /samples, falling back to minimal headers', e);
    }

    // Fallback if fetch failed: provide valid %PDF and PK zip headers to pass backend file validators
    const minimalPdf = new Uint8Array([
      0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xd0, 0xd4, 0xc5, 0xd8, 0x0a,
      0x31, 0x20, 0x30, 0x20, 0x6f, 0x62, 0x6a, 0x0a, 0x3c, 0x3c, 0x2f, 0x54, 0x79, 0x70, 0x65,
      0x2f, 0x43, 0x61, 0x74, 0x61, 0x6c, 0x6f, 0x67, 0x2f, 0x50, 0x61, 0x67, 0x65, 0x73, 0x20,
      0x32, 0x20, 0x30, 0x20, 0x52, 0x3e, 0x3e, 0x0a, 0x65, 0x6e, 0x64, 0x6f, 0x62, 0x6a, 0x0a,
    ]);
    const minimalZip = new Uint8Array([
      0x50, 0x4b, 0x05, 0x06, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    ]);
    const demoSource = new File([minimalPdf], 'Master_Services_Agreement_2026.pdf', {
      type: 'application/pdf',
    });
    const demoTemplate = new File([minimalZip], 'Executive_Contract_Summary_Template.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
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
      let currentProgress = 15;
      setProgress({
        jobId,
        sessionId: session.sessionId,
        status: 'extracting',
        progressPercent: currentProgress,
        currentStep: '1/4: Parsing and OCR on Source PDF...',
        fieldsProcessed: 1,
        totalFields: 8,
      });

      let pollAttempts = 0;
      const interval = setInterval(async () => {
        try {
          pollAttempts++;
          currentProgress = Math.min(95, currentProgress + 15);
          const updated = await api.getJobProgress(jobId, currentProgress);
          setProgress(updated);

          if (updated.status === 'completed' || updated.progressPercent >= 100 || pollAttempts >= 12) {
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
          } else if (updated.status === 'failed') {
            clearInterval(interval);
            throw new Error(updated.errorMessage || 'Job failed during backend processing');
          }
        } catch (pollErr: any) {
          clearInterval(interval);
          console.warn('Extraction polling failed, switching to demo mode fallback:', pollErr);
          addToast(
            'warning',
            'Live Pipeline Fallback',
            pollErr?.message || 'Backend processing encountered an issue. Switched to demo data for review.'
          );
          const mockResult = await api.getFieldMappings(session.sessionId);
          setExtractionResult(mockResult);
          setIsProcessing(false);
          setCurrentStep('review');
        }
      }, 750);
    } catch (err: any) {
      console.warn('Upload/Extraction error, falling back to interactive demo session:', err);
      addToast(
        'warning',
        'Backend Fallback to Demo Mode',
        err?.message || 'Could not process via live backend. Switched to interactive demo mode.'
      );
      const fallbackSession: SessionInfo = {
        sessionId: `demo-${Date.now().toString(36)}`,
        sourceDoc: {
          filename: sourceFile.name,
          sizeBytes: sourceFile.size,
          format: 'pdf',
          pageCount: 3,
        },
        templateDoc: {
          filename: templateFile.name,
          sizeBytes: templateFile.size,
          format: 'docx',
          detectedFieldsCount: 8,
        },
        createdAt: new Date().toISOString(),
      };
      setSessionInfo(fallbackSession);
      const mockResult = await api.getFieldMappings(fallbackSession.sessionId);
      setExtractionResult(mockResult);
      setIsProcessing(false);
      setCurrentStep('review');
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

  // Authentication handlers
  const handleAuthSuccess = (authedUser: UserAccount) => {
    setUser(authedUser);
    addToast(
      'success',
      authedUser.isAnonymous ? 'Guest Mode Active' : 'Account Connected',
      `Welcome ${authedUser.name} (${authedUser.tier.toUpperCase()} tier)`
    );
  };

  const handleSignOut = () => {
    api.clearUserSession();
    const guest = api.getAnonymousUser();
    setUser(guest);
    addToast('info', 'Signed Out', 'Switched to Anonymous Guest mode.');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <Navbar
        currentStep={currentStep}
        onNavigateStep={setCurrentStep}
        isBackendLive={isBackendLive}
        onToggleTheme={handleToggleTheme}
        isDark={isDark}
        onOpenHistory={() => setIsHistoryOpen(true)}
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onSignOut={handleSignOut}
        onOpenHelp={() => setIsHelpOpen(true)}
      />
      <BackendWakingBanner status={backendStatus} retryCount={wakeRetries} onRetry={checkBackend} />

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
              if (sessionInfo) {
                const updated = await api.reExtractField(sessionInfo.sessionId, fieldId, hint);
                if (updated && extractionResult) {
                  setExtractionResult({
                    ...extractionResult,
                    fields: extractionResult.fields.map((f) => (f.id === fieldId ? updated : f)),
                  });
                  addToast('success', 'Field Re-extracted', `New value: "${updated.extractedValue}"`);
                }
              }
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

      <Footer onOpenHelp={() => setIsHelpOpen(true)} />

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

      {/* User Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Interactive User Guide Modal */}
      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
    </div>
  );
}

