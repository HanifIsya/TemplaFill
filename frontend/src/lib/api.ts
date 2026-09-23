import {
  SessionInfo,
  JobProgress,
  ExtractionResult,
  GenerationResult,
  FieldMapping,
} from './types';
import { MOCK_FIELDS, MOCK_GENERATION } from './mockData';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

class ApiClient {
  private baseUrl: string;
  private isBackendAvailable: boolean | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async checkHealth(): Promise<{ status: string; version: string; isLive: boolean }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${this.baseUrl}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        this.isBackendAvailable = true;
        return { status: 'healthy', version: data.version || '0.1.0', isLive: true };
      }
    } catch {
      // Backend not yet reachable (e.g. running in mock/demo mode during initial frontend dev)
    }
    this.isBackendAvailable = false;
    return { status: 'mock_mode', version: '0.1.0-dev', isLive: false };
  }

  async uploadFiles(sourceFile: File, templateFile: File): Promise<SessionInfo> {
    const health = await this.checkHealth();
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
}

export const api = new ApiClient(BASE_URL);
