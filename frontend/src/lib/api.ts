import {
  SessionInfo,
  JobProgress,
  JobStatusType,
  ExtractionResult,
  GenerationResult,
  FieldMapping,
  UserAccount,
  AuthResponse,
} from './types';
import { MOCK_FIELDS, MOCK_GENERATION } from './mockData';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

class ApiClient {
  private baseUrl: string;
  private isBackendAvailable: boolean | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async checkHealth(options: { timeoutMs?: number } = {}): Promise<{
    status: string;
    version: string;
    isLive: boolean;
    isWaking?: boolean;
    error?: string;
  }> {
    const timeoutMs = options.timeoutMs ?? 7000; // Render cold start ~60s, but single probe 7s to allow retry loop outside
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(`${this.baseUrl}/health`, {
        signal: controller.signal,
        // Render may return 502/503 while waking; we treat any 2xx as live
        cache: 'no-store',
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        // API returns {success:true, data:{status, version}} ; handle both shapes
        const version = (data as any)?.data?.version || (data as any)?.version || '0.1.0';
        this.isBackendAvailable = true;
        return { status: 'healthy', version, isLive: true };
      }
      // 502/503/504 often means Render is waking or booting
      if ([502, 503, 504].includes(res.status)) {
        this.isBackendAvailable = false;
        return { status: 'waking', version: '0.1.0', isLive: false, isWaking: true, error: `Backend waking (HTTP ${res.status})` };
      }
    } catch (e: any) {
      const msg = e?.name === 'AbortError' ? 'Health check timed out (Render may be waking)' : String(e?.message || e);
      // Timeout after 15 min idle is expected for Render Hobby
      const isWaking = msg.includes('timed out') || msg.includes('Failed to fetch') || msg.includes('NetworkError');
      this.isBackendAvailable = false;
      return {
        status: isWaking ? 'waking' : 'mock_mode',
        version: '0.1.0-dev',
        isLive: false,
        isWaking,
        error: msg,
      };
    }
    this.isBackendAvailable = false;
    return { status: 'mock_mode', version: '0.1.0-dev', isLive: false };
  }

  /** Poll until backend is live or maxRetries exceeded — for Render cold start (Hobby sleeps 15 min, wake ~60s). */
  async waitForBackend(maxRetries: number = 12, intervalMs: number = 5000): Promise<{ isLive: boolean; attempts: number }> {
    for (let i = 0; i < maxRetries; i++) {
      const health = await this.checkHealth({ timeoutMs: 8000 });
      if (health.isLive) return { isLive: true, attempts: i + 1 };
      if (!health.isWaking && health.status === 'mock_mode') {
        // Not waking, just offline/mock — don't keep polling aggressively
        if (i >= 2) return { isLive: false, attempts: i + 1 };
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    return { isLive: false, attempts: maxRetries };
  }

  async uploadFiles(sourceFile: File, templateFile: File): Promise<SessionInfo> {
    const health = await this.checkHealth({ timeoutMs: 8000 });
    // If backend is waking, give it a short grace window (Render cold start) before falling back to mock
    if (!health.isLive && health.isWaking) {
      const waited = await this.waitForBackend(6, 5000);
      if (waited.isLive) {
        const retryHealth = await this.checkHealth();
        if (retryHealth.isLive) {
          const formData = new FormData();
          formData.append('source_file', sourceFile);
          formData.append('template_file', templateFile);
          const res = await fetch(`${this.baseUrl}/upload`, { method: 'POST', body: formData });
          if (res.ok) {
            const data = await res.json();
            const jobData = data.data || data;
            const jobId = jobData.job_id || `job-${Date.now().toString(36)}`;
            return {
              sessionId: jobId,
              sourceDoc: {
                filename: jobData.source_file?.filename || sourceFile.name,
                sizeBytes: jobData.source_file?.size_bytes || sourceFile.size,
                format: 'pdf',
                pageCount: jobData.source_file?.page_count || 1,
              },
              templateDoc: {
                filename: jobData.template_file?.filename || templateFile.name,
                sizeBytes: jobData.template_file?.size_bytes || templateFile.size,
                format: jobData.template_file?.format || templateFile.name.split('.').pop() || 'docx',
                detectedFieldsCount: 8,
              },
              createdAt: jobData.created_at || new Date().toISOString(),
            };
          }
          let errText = res.statusText;
          try {
            const errJson = await res.json();
            if (errJson?.error?.message) errText = errJson.error.message;
          } catch {}
          throw new Error(`Upload failed: ${errText}`);
        }
      }
      throw new Error('Backend is waking up (Render Hobby cold start ~60s). Please wait and retry — or use mock demo mode.');
    }

    if (health.isLive) {
      const formData = new FormData();
      formData.append('source_file', sourceFile);
      formData.append('template_file', templateFile);

      const res = await fetch(`${this.baseUrl}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        let errMessage = res.statusText;
        try {
          const errData = await res.json();
          if (errData?.error?.message) errMessage = errData.error.message;
        } catch {}
        throw new Error(`Upload failed: ${errMessage}`);
      }

      const data = await res.json();
      const jobData = data.data || data;
      const jobId = jobData.job_id || `job-${Date.now().toString(36)}`;
      return {
        sessionId: jobId,
        sourceDoc: {
          filename: jobData.source_file?.filename || sourceFile.name,
          sizeBytes: jobData.source_file?.size_bytes || sourceFile.size,
          format: 'pdf',
          pageCount: jobData.source_file?.page_count || 1,
        },
        templateDoc: {
          filename: jobData.template_file?.filename || templateFile.name,
          sizeBytes: jobData.template_file?.size_bytes || templateFile.size,
          format: jobData.template_file?.format || templateFile.name.split('.').pop() || 'docx',
          detectedFieldsCount: 8,
        },
        createdAt: jobData.created_at || new Date().toISOString(),
      };
    }

    // Dev Fallback Mock
    await new Promise((resolve) => setTimeout(resolve, 800));
    return {
      sessionId: `session-${Date.now().toString(36)}`,
      sourceDoc: {
        filename: sourceFile.name,
        sizeBytes: sourceFile.size,
        format: 'pdf',
        pageCount: Math.max(1, Math.floor(sourceFile.size / 120000)),
      },
      templateDoc: {
        filename: templateFile.name,
        sizeBytes: templateFile.size,
        format: templateFile.name.split('.').pop() || 'docx',
        detectedFieldsCount: 8,
      },
      createdAt: new Date().toISOString(),
    };
  }

  async startExtraction(sessionId: string): Promise<{ jobId: string }> {
    // In backend pipeline, POST /api/upload already initializes and queues the job with job_id === sessionId.
    return { jobId: sessionId };
  }

  async getJobProgress(jobId: string, currentPercent: number = 0): Promise<JobProgress> {
    const health = await this.checkHealth();
    if (health.isLive) {
      try {
        const res = await fetch(`${this.baseUrl}/jobs/${jobId}`, { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          const job = json.data || json;
          const progress = job.progress || {};
          const status = (job.status as JobStatusType) || 'extracting';
          let currentStep = 'Processing document pipeline...';
          if (status === 'extracting') currentStep = '1/4: Parsing and OCR on Source PDF...';
          else if (status === 'embedding') currentStep = '2/4: Chunking text & generating embeddings...';
          else if (status === 'mapping') currentStep = `3/4: Inspecting placeholders & mapping (${progress.current_field || 0}/${progress.total_fields || 8})...`;
          else if (status === 'completed') currentStep = '4/4: Field extraction complete!';
          else if (status === 'failed') currentStep = `Extraction failed: ${job.error || 'Pipeline error'}`;

          let pct = progress.percent;
          if (pct === undefined || pct === null) {
            pct = status === 'completed' ? 100 : currentPercent;
          }

          return {
            jobId,
            sessionId: jobId,
            status,
            progressPercent: pct,
            currentStep,
            fieldsProcessed: progress.current_field || 0,
            totalFields: progress.total_fields || 8,
            errorMessage: job.error,
          };
        }
      } catch (err) {
        console.warn('Polling job error, falling back to simulated progress', err);
      }
    }

    // Mock progress simulation
    const nextPercent = Math.min(100, currentPercent + 25);
    let step = '1/4: Parsing and OCR on Source PDF...';
    let status: JobProgress['status'] = 'extracting';

    if (nextPercent >= 35 && nextPercent < 60) {
      step = '2/4: Chunking text & generating Gemini embeddings...';
      status = 'embedding';
    } else if (nextPercent >= 60 && nextPercent < 95) {
      step = '3/4: Inspecting template placeholders & mapping fields...';
      status = 'mapping';
    } else if (nextPercent >= 100) {
      step = '4/4: Field extraction complete!';
      status = 'completed';
    }

    return {
      jobId,
      sessionId: jobId.replace('job-', ''),
      status,
      progressPercent: nextPercent,
      currentStep: step,
      fieldsProcessed: Math.round((nextPercent / 100) * 8),
      totalFields: 8,
    };
  }

  async getFieldMappings(sessionId: string): Promise<ExtractionResult> {
    const health = await this.checkHealth();
    if (health.isLive) {
      try {
        const res = await fetch(`${this.baseUrl}/jobs/${sessionId}/results`, { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          const data = json.data || json;
          const rawFields: any[] = data.fields || [];
          if (rawFields.length > 0) {
            const fields: FieldMapping[] = rawFields.map((f: any, idx: number) => {
              const conf = typeof f.confidence === 'number' ? f.confidence : 0.85;
              const confLevel: 'high' | 'medium' | 'low' = conf >= 0.8 ? 'high' : conf >= 0.5 ? 'medium' : 'low';
              const fieldName = f.field_name || `field_${idx}`;
              let fType: FieldMapping['fieldType'] = 'text';
              if (/date|time|period|deadline/i.test(fieldName)) fType = 'date';
              else if (/price|cost|fee|amount|rate|value|budget/i.test(fieldName)) fType = 'currency';
              else if (/count|qty|quantity|number|num|total_items/i.test(fieldName)) fType = 'number';
              else if (/items|list|table|rows/i.test(fieldName)) fType = 'table';

              return {
                id: f.field_id || `f-${idx}`,
                templateField: f.placeholder || f.field_name || `field_${idx}`,
                label: f.field_label || f.field_name || `Field ${idx + 1}`,
                targetLocation: f.source_reference?.page ? `Page ${f.source_reference.page}` : 'Document Body',
                extractedValue: f.user_edited_value || f.extracted_value || '',
                confidence: conf,
                confidenceLevel: confLevel,
                sourcePage: f.source_reference?.page || 1,
                sourceSnippet: f.source_reference?.snippet || '',
                isEdited: Boolean(f.is_manually_edited),
                isConfirmed: f.status === 'confirmed',
                isSkipped: f.status === 'skipped',
                fieldType: fType,
              };
            });

            const high = fields.filter((f) => f.confidence >= 0.8).length;
            const medium = fields.filter((f) => f.confidence >= 0.5 && f.confidence < 0.8).length;
            const low = fields.filter((f) => f.confidence < 0.5).length;
            const avg = fields.reduce((acc, f) => acc + f.confidence, 0) / fields.length;

            return {
              sessionId,
              totalFields: fields.length,
              highConfidenceCount: high,
              mediumConfidenceCount: medium,
              lowConfidenceCount: low,
              averageConfidence: avg,
              fields,
            };
          }
        }
      } catch (err) {
        console.warn('Fetch results error, using mock fields', err);
      }
    }

    // Mock data return
    const fields = MOCK_FIELDS;
    const high = fields.filter((f) => f.confidence >= 0.8).length;
    const medium = fields.filter((f) => f.confidence >= 0.5 && f.confidence < 0.8).length;
    const low = fields.filter((f) => f.confidence < 0.5).length;
    const avg = fields.reduce((acc, f) => acc + f.confidence, 0) / fields.length;

    return {
      sessionId,
      totalFields: fields.length,
      highConfidenceCount: high,
      mediumConfidenceCount: medium,
      lowConfidenceCount: low,
      averageConfidence: avg,
      fields,
    };
  }

  async updateField(
    sessionId: string,
    fieldId: string,
    extractedValue: string
  ): Promise<FieldMapping> {
    const health = await this.checkHealth();
    if (health.isLive) {
      try {
        const res = await fetch(`${this.baseUrl}/jobs/${sessionId}/fields/${fieldId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'edit', value: extractedValue }),
        });
        if (res.ok) {
          const json = await res.json();
          const data = json.data || json;
          return {
            id: data.field_id || fieldId,
            templateField: data.field_name || fieldId,
            label: data.field_name || 'Field',
            targetLocation: 'Document Body',
            extractedValue: data.extracted_value || extractedValue,
            confidence: 1.0,
            confidenceLevel: 'high',
            isEdited: true,
            isConfirmed: false,
            fieldType: 'text',
          };
        }
      } catch (err) {
        console.warn('Failed to update field on backend', err);
      }
    }

    const field = MOCK_FIELDS.find((f) => f.id === fieldId) || MOCK_FIELDS[0];
    return {
      ...field,
      extractedValue,
      isEdited: true,
      confidence: 1.0,
      confidenceLevel: 'high',
    };
  }

  async reExtractField(
    sessionId: string,
    fieldId: string,
    hint: string
  ): Promise<FieldMapping | null> {
    const health = await this.checkHealth();
    if (health.isLive) {
      try {
        const res = await fetch(`${this.baseUrl}/jobs/${sessionId}/fields/${fieldId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 're_extract', hint }),
        });
        if (res.ok) {
          const json = await res.json();
          const data = json.data || json;
          return {
            id: data.field_id || fieldId,
            templateField: data.field_name || fieldId,
            label: data.field_name || 'Field',
            targetLocation: data.source_reference?.page ? `Page ${data.source_reference.page}` : 'Document Body',
            extractedValue: data.new_value || data.extracted_value || '',
            confidence: data.confidence || 0.9,
            confidenceLevel: (data.confidence || 0.9) >= 0.8 ? 'high' : 'medium',
            sourcePage: data.source_reference?.page || 1,
            sourceSnippet: data.source_reference?.snippet || '',
            isEdited: false,
            isConfirmed: false,
            reExtractHint: hint,
            fieldType: 'text',
          };
        }
      } catch (err) {
        console.warn('Re-extract request error', err);
      }
    }
    return null;
  }

  async generateDocument(
    sessionId: string,
    confirmedFields: Record<string, string>
  ): Promise<GenerationResult> {
    const health = await this.checkHealth();
    if (health.isLive) {
      try {
        const res = await fetch(`${this.baseUrl}/jobs/${sessionId}/confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            include_summary_report: true,
          }),
        });
        if (res.ok) {
          return {
            sessionId,
            downloadUrl: `${this.baseUrl}/jobs/${sessionId}/download?type=filled`,
            filename: `Executive_Summary_Filled_${sessionId.slice(0, 8)}.docx`,
            fileSizeBytes: 38400,
            format: 'docx',
            generatedAt: new Date().toISOString(),
          };
        }
      } catch (err) {
        console.warn('Generate document live error, using mock generation', err);
      }
    }

    await new Promise((r) => setTimeout(r, 600));
    return {
      ...MOCK_GENERATION,
      sessionId,
      downloadUrl: `${this.baseUrl}/jobs/${sessionId}/download?type=filled`,
    };
  }

  getDownloadUrl(sessionId: string): string {
    return `${this.baseUrl}/jobs/${sessionId}/download?type=filled`;
  }

  // Authentication & Session Management (Task 3.8)
  getAnonymousUser(): UserAccount {
    return {
      id: 'anon-guest-user',
      email: 'guest@templafill.local',
      name: 'Guest User',
      tier: 'free',
      remainingFills: 3,
      isAnonymous: true,
      createdAt: new Date().toISOString(),
    };
  }

  getStoredUser(): UserAccount | null {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem('templafill_auth_user');
      if (stored) return JSON.parse(stored);
    } catch {
      // Ignore localStorage access errors
    }
    return null;
  }

  saveUserSession(auth: AuthResponse): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('templafill_auth_user', JSON.stringify(auth.user));
      localStorage.setItem('templafill_auth_token', auth.tokens.accessToken);
    } catch {
      // Ignore
    }
  }

  clearUserSession(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem('templafill_auth_user');
      localStorage.removeItem('templafill_auth_token');
    } catch {
      // Ignore
    }
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const health = await this.checkHealth();
    if (health.isLive) {
      const res = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        const data = await res.json();
        this.saveUserSession(data);
        return data;
      }
    }

    // Local / Dev Fallback
    await new Promise((r) => setTimeout(r, 400));
    const mockAuth: AuthResponse = {
      user: {
        id: `user-${Date.now().toString(36)}`,
        email,
        name: email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        tier: 'pro',
        remainingFills: 9999,
        isAnonymous: false,
        createdAt: new Date().toISOString(),
      },
      tokens: {
        accessToken: `tf_jwt_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`,
        expiresIn: 86400,
      },
    };
    this.saveUserSession(mockAuth);
    return mockAuth;
  }

  async register(name: string, email: string, password: string): Promise<AuthResponse> {
    const health = await this.checkHealth();
    if (health.isLive) {
      const res = await fetch(`${this.baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      if (res.ok) {
        const data = await res.json();
        this.saveUserSession(data);
        return data;
      }
    }

    // Local / Dev Fallback
    await new Promise((r) => setTimeout(r, 500));
    const mockAuth: AuthResponse = {
      user: {
        id: `user-${Date.now().toString(36)}`,
        email,
        name,
        tier: 'pro',
        remainingFills: 9999,
        isAnonymous: false,
        createdAt: new Date().toISOString(),
      },
      tokens: {
        accessToken: `tf_jwt_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`,
        expiresIn: 86400,
      },
    };
    this.saveUserSession(mockAuth);
    return mockAuth;
  }
}

export const api = new ApiClient(BASE_URL);

