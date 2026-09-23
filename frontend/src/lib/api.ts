import {
  SessionInfo,
  JobProgress,
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
    // The UI layer (BackendWakingBanner) already polls, but we also do one extra wait here for direct uploads
    if (!health.isLive && health.isWaking) {
      const waited = await this.waitForBackend(6, 5000);
      if (waited.isLive) {
        // Re-check and proceed to live upload
        const retryHealth = await this.checkHealth();
        if (retryHealth.isLive) {
          const formData = new FormData();
          formData.append('source_file', sourceFile);
          formData.append('template_file', templateFile);
          const res = await fetch(`${this.baseUrl}/upload`, { method: 'POST', body: formData });
          if (res.ok) return await res.json();
          throw new Error(`Upload failed: ${res.statusText}`);
        }
      }
      // Still waking — throw specific error so UI can show banner instead of silent mock fallback
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
        throw new Error(`Upload failed: ${res.statusText}`);
      }
      return await res.json();
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
    const health = await this.checkHealth();
    if (health.isLive) {
      const res = await fetch(`${this.baseUrl}/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      });
      if (!res.ok) throw new Error('Failed to start extraction');
      return await res.json();
    }

    return { jobId: `job-${sessionId}` };
  }

  async getJobProgress(jobId: string, currentPercent: number = 0): Promise<JobProgress> {
    const health = await this.checkHealth();
    if (health.isLive) {
      const res = await fetch(`${this.baseUrl}/jobs/${jobId}`);
      if (!res.ok) throw new Error('Failed to poll job');
      return await res.json();
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
      const res = await fetch(`${this.baseUrl}/mapping/${sessionId}`);
      if (!res.ok) throw new Error('Failed to load field mappings');
      return await res.json();
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
      const res = await fetch(`${this.baseUrl}/mapping/${sessionId}/fields`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field_id: fieldId, value: extractedValue }),
      });
      if (!res.ok) throw new Error('Failed to update field');
      return await res.json();
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

  async generateDocument(
    sessionId: string,
    confirmedFields: Record<string, string>
  ): Promise<GenerationResult> {
    const health = await this.checkHealth();
    if (health.isLive) {
      const res = await fetch(`${this.baseUrl}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          field_overrides: confirmedFields,
        }),
      });
      if (!res.ok) throw new Error('Failed to generate document');
      return await res.json();
    }

    await new Promise((r) => setTimeout(r, 600));
    return {
      ...MOCK_GENERATION,
      sessionId,
    };
  }

  getDownloadUrl(sessionId: string): string {
    return `${this.baseUrl}/download/${sessionId}`;
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

