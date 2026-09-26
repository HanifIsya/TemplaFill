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
import { HelpModal } from '../components/HelpModal';
import { LoginModal } from '../components/LoginModal';
import { AccountRequestView } from '../components/AccountRequestView';
import { BackendWakingBanner } from '../components/BackendWakingBanner';
import {
  WorkflowStep,
  SessionInfo,
  JobProgress,
  ExtractionResult,
  GenerationResult,
  ToastMessage,
  HistoryEntry,
  Tier,
  QuotaInfo,
} from '../lib/types';
import { api, QuotaExceededError } from '../lib/api';
import { FREE_DAILY_LIMIT, remainingFreeJobs } from '../lib/tier';
import { MOCK_DEMO_SESSION } from '../lib/mockData';

export default function Home() {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('landing');
  const [isBackendLive, setIsBackendLive] = useState<boolean>(false);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'waking' | 'live' | 'offline' | 'mock'>('checking');
  const [wakeRetries, setWakeRetries] = useState<number>(0);

  // Tier / auth state (Phase 6)
  const [tier, setTier] = useState<Tier>('free');
  const [quota, setQuota] = useState<QuotaInfo>({ free_used_today: 0, free_limit: FREE_DAILY_LIMIT, tier: 'free' });
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [quotaRetryAfter, setQuotaRetryAfter] = useState<number | undefined>(undefined);

  // User Guide Modal state
  const [isHelpOpen, setIsHelpOpen] = useState(false);

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

  // History sessions state (browser-local `tf_history`)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [recentSessions, setRecentSessions] = useState<HistoryEntry[]>([]);

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
    // Deferred so the initial backend check doesn't set state synchronously in the effect body.
    const id = setTimeout(() => {
      checkBackend();
    }, 0);
    return () => clearTimeout(id);
  }, [checkBackend]);

  // Hydrate tier + quota + history from browser storage on mount.
  useEffect(() => {
    const id = setTimeout(() => {
      setTier(api.getTier());
      setRecentSessions(api.getHistory());
      api.getQuota().then((q) => {
        setQuota(q);
        setTier(q.tier);
      });
    }, 0);
    return () => clearTimeout(id);
  }, []);

  const refreshQuota = useCallback(async () => {
    const q = await api.getQuota();
    setQuota(q);
    return q;
  }, []);

  const handleLoginSuccess = useCallback(async () => {
    setIsLoginOpen(false);
    const loggedInTier = api.getTier();
    setTier(loggedInTier);
    const q = await api.getQuota();
    setQuota(q);
    setTier(q.tier);
    addToast('success', 'Account Tier Active', 'Signed in — processing now runs on DeepSeek.');
    if (currentStep === 'account-request') setCurrentStep('upload');
  }, [addToast, currentStep]);

  const handleLogout = useCallback(async () => {
    await api.logout();
    setTier('free');
    const q = await api.getQuota();
    setQuota(q);
    addToast('info', 'Signed Out', 'Back to the free tier (Google Gemini, 5 jobs/day).');
  }, [addToast]);

  const openAccountRequest = useCallback(() => {
    setCurrentStep('account-request');
  }, []);

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
      if (session.tier) setTier(session.tier);
      // Refresh the free-tier countdown after a successful upload.
      refreshQuota();

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
          const updated = await api.getJobProgress(jobId, currentProgress);
          setProgress(updated);
          if (typeof updated.progressPercent === 'number' && updated.progressPercent > 0) {
            currentProgress = updated.progressPercent;
          }

          const isComplete = updated.status === 'completed';
          const isTimeout = pollAttempts >= 300; // 300 * 1s = 5 minutes allowance for cloud processing and cold starts

          if (isComplete) {
            clearInterval(interval);
            // Fetch results
            const result = await api.getFieldMappings(session.sessionId);
            setExtractionResult(result);
            setIsProcessing(false);
            setCurrentStep('review');
            if (result.hasFallback || result.hasAiError || result.engineUsed === 'heuristic') {
              addToast(
                'warning',
                'Heuristic Fallback Active',
                result.fallbackReason || (result.tier === 'pro'
                  ? 'DeepSeek was unavailable. Data was extracted using the local heuristic engine.'
                  : 'Gemini AI hit a quota or connectivity limit. Data was extracted using the local heuristic engine.')
              );
            } else if (result.engineUsed === 'deepseek') {
              addToast(
                'success',
                'DeepSeek — Extraction Complete',
                `Successfully extracted ${result.totalFields} fields on the DeepSeek account engine.`
              );
            } else if (result.engineUsed === 'hybrid') {
              addToast(
                'info',
                'Hybrid Extraction (AI + Fallback)',
                'Some fields were extracted by the AI engine and others were recovered by the heuristic engine.'
              );
            } else {
              addToast(
                'success',
                'Google Gemini — Extraction Complete',
                `Successfully extracted ${result.totalFields} fields directly with Google Gemini.`
              );
            }
          } else if (isTimeout) {
            clearInterval(interval);
            throw new Error('Proses ekstraksi membutuhkan waktu lebih lama dari biasanya di server cloud. Silakan periksa koneksi atau coba sesaat lagi.');
          } else if (updated.status === 'failed') {
            clearInterval(interval);
            throw new Error(updated.errorMessage || 'Job failed during backend processing');
          }
        } catch (pollErr: unknown) {
          clearInterval(interval);
          console.error('Extraction polling failed:', pollErr);
          addToast(
            'error',
            'Extraction Notice',
            pollErr instanceof Error ? pollErr.message : 'Backend processing encountered an issue.'
          );
          setIsProcessing(false);
          setCurrentStep('upload');
        }
      }, 1000);
    } catch (err: unknown) {
      console.error('Upload / Extraction error:', err);
      setIsProcessing(false);
      if (err instanceof QuotaExceededError) {
        setQuotaRetryAfter(err.retryAfterSeconds);
        addToast(
          'warning',
          'Daily Limit Reached',
          err.tier === 'free'
            ? 'You have used all 5 free jobs today. Request an account for a higher limit.'
            : 'Your account daily cap has been reached. Please try again tomorrow.'
        );
        setCurrentStep('account-request');
        return;
      }
      addToast(
        'error',
        'Upload / Extraction Failed',
        err instanceof Error ? err.message : 'Could not process via live backend.'
      );
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

      // Save to browser-local history (`tf_history`, TIER_ARCHITECTURE §6)
      const newSession: HistoryEntry = {
        sessionId: sessionInfo.sessionId,
        createdAt: new Date().toISOString(),
        tier: sessionInfo.tier || tier,
        engineUsed: extractionResult?.engineUsed || 'mock',
        sourceDoc: {
          filename: sessionInfo.sourceDoc.filename,
          size: sessionInfo.sourceDoc.sizeBytes,
        },
        templateDoc: {
          filename: sessionInfo.templateDoc.filename,
          format: sessionInfo.templateDoc.format,
        },
        overallConfidence: extractionResult?.averageConfidence ?? 0,
        fieldCount: Object.keys(confirmedFields).length,
        filledFilename: res.filename,
        downloadExpired: true,
      };

      setRecentSessions(api.saveHistoryEntry(newSession));

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
    api.clearHistory();
    setRecentSessions([]);
    addToast('info', 'History Cleared', 'All local session records removed.');
  };

  // Download past session file
  const handleDownloadSessionFile = (session: HistoryEntry) => {
    const blob = new Blob([
      `TemplaFill Restored Output\nSession: ${session.sessionId}\nDate: ${session.createdAt}`
    ], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = session.filledFilename;
    a.click();
    URL.revokeObjectURL(url);
    addToast('success', 'Downloaded', `Saved ${session.filledFilename}`);
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
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar
        currentStep={currentStep}
        onNavigateStep={setCurrentStep}
        isBackendLive={isBackendLive}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
        tier={tier}
        onOpenLogin={() => setIsLoginOpen(true)}
        onLogout={handleLogout}
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
            tier={tier}
            remaining={remainingFreeJobs(quota)}
            freeLimit={quota.free_limit}
            onRequestAccount={openAccountRequest}
            onOpenLogin={() => setIsLoginOpen(true)}
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
            tier={tier}
            remaining={remainingFreeJobs(quota)}
            freeLimit={quota.free_limit}
            onRequestAccount={openAccountRequest}
            onOpenLogin={() => setIsLoginOpen(true)}
          />
        )}

        {currentStep === 'account-request' && (
          <AccountRequestView
            onBack={() => setCurrentStep('upload')}
            onOpenLogin={() => setIsLoginOpen(true)}
            retryAfterSeconds={quotaRetryAfter}
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
                `Prompting the ${tier === 'pro' ? 'DeepSeek' : 'Gemini'} engine with hint: "${hint || 'Context refinement'}"`
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

      {/* Interactive User Guide Modal */}
      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />

      {/* Tier Login Modal */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onSuccess={handleLoginSuccess}
      />
    </div>
  );
}

