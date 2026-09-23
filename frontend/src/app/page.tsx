'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { HeroLanding } from '../components/HeroLanding';
import { DualDropzone } from '../components/DualDropzone';
import { ProcessingView } from '../components/ProcessingView';
import { ReviewMappingView } from '../components/ReviewMappingView';
import { DownloadView } from '../components/DownloadView';
import {
  WorkflowStep,
  SessionInfo,
  JobProgress,
  ExtractionResult,
  GenerationResult,
} from '../lib/types';
import { api } from '../lib/api';
import { MOCK_DEMO_SESSION } from '../lib/mockData';

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
    });
  }, []);

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
  };

  // Start extraction workflow
  const handleStartExtraction = async () => {
    if (!sourceFile || !templateFile) return;

    setIsProcessing(true);
    setCurrentStep('processing');

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
        }
      }, 700);
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
      alert('Error during processing. Reverting to upload.');
      setCurrentStep('upload');
    }
  };

  // Update field value in review
  const handleUpdateField = async (fieldId: string, newValue: string) => {
    if (!sessionInfo) return;
    await api.updateField(sessionInfo.sessionId, fieldId, newValue);
  };

  // Confirm fields and generate final template
  const handleConfirmAndGenerate = async (confirmedFields: Record<string, string>) => {
    if (!sessionInfo) return;
    setIsGenerating(true);

    try {
      const res = await api.generateDocument(sessionInfo.sessionId, confirmedFields);
      setGenerationResult(res);
      setIsGenerating(false);
      setCurrentStep('download');
    } catch (err) {
      console.error(err);
      setIsGenerating(false);
      alert('Error during document generation.');
    }
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
            onSetSourceFile={setSourceFile}
            onSetTemplateFile={setTemplateFile}
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
    </div>
  );
}
