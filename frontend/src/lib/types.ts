/**
 * TemplaFill Data Models & Types
 * Matching docs/2-architecture/API.md and DATA_MODEL.md
 */

export type TemplateFormat = 'docx' | 'xlsx' | 'pptx' | 'pdf';

export type JobStatusType = 'pending' | 'extracting' | 'embedding' | 'mapping' | 'completed' | 'failed';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export type Tier = 'free' | 'pro';

export type ExtractionEngine = 'gemini' | 'deepseek' | 'heuristic' | 'hybrid' | 'mock';

export interface UploadedDocInfo {
  filename: string;
  sizeBytes: number;
  format: string;
  pageCount?: number;
  detectedFieldsCount?: number;
}

export interface SessionInfo {
  sessionId: string;
  sourceDoc: UploadedDocInfo;
  templateDoc: UploadedDocInfo;
  createdAt: string;
  tier?: Tier;
  sessionToken?: string;
}

export interface JobProgress {
  jobId: string;
  sessionId: string;
  status: JobStatusType;
  progressPercent: number;
  currentStep: string;
  fieldsProcessed: number;
  totalFields: number;
  errorMessage?: string;
}

export interface FieldMapping {
  id: string;
  templateField: string;
  label: string;
  targetLocation: string; // e.g., "Page 1, Paragraph 3" or "Sheet 1, Cell B4"
  extractedValue: string;
  confidence: number; // 0.0 - 1.0
  confidenceLevel: ConfidenceLevel;
  sourcePage?: number;
  sourceSnippet?: string;
  isEdited: boolean;
  isConfirmed: boolean;
  isSkipped?: boolean;
  reExtractHint?: string;
  fieldType: 'text' | 'date' | 'number' | 'currency' | 'table';
  extractedBy?: 'gemini' | 'deepseek' | 'heuristic' | 'manual';
  fallbackReason?: string;
}

export interface ExtractionResult {
  sessionId: string;
  totalFields: number;
  highConfidenceCount: number;
  mediumConfidenceCount: number;
  lowConfidenceCount: number;
  averageConfidence: number;
  fields: FieldMapping[];
  hasAiError?: boolean;
  hasFallback?: boolean;
  aiErrorMessage?: string;
  fallbackReason?: string;
  engineUsed?: ExtractionEngine;
  tier?: Tier;
}

export interface GenerationResult {
  sessionId: string;
  downloadUrl: string;
  filename: string;
  fileSizeBytes: number;
  format: TemplateFormat;
  generatedAt: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
}

/** Browser-local history entry persisted under `tf_history` (TIER_ARCHITECTURE §6). */
export interface HistoryEntry {
  sessionId: string;
  createdAt: string;
  tier: Tier;
  engineUsed: ExtractionEngine;
  sourceDoc: { filename: string; size: number };
  templateDoc: { filename: string; format: string };
  overallConfidence: number;
  fieldCount: number;
  filledFilename: string;
  downloadExpired: boolean;
}

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  tier: Tier | 'enterprise';
  remainingFills: number; // e.g. 3 for free anonymous, unlimited for registered
  isAnonymous: boolean;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: UserAccount;
  tokens: AuthTokens;
}

/** `POST /api/auth/login` response — shared credential → signed tier token. */
export interface LoginResult {
  tier: Tier;
  token: string;
}

/** `GET /api/auth/quota` response — powers the free-tier quota countdown. */
export interface QuotaInfo {
  free_used_today: number;
  free_limit: number;
  tier: Tier;
}

/** Raised by `api.uploadFiles` when the backend returns 429 QUOTA_EXCEEDED. */
export interface QuotaExceededError extends Error {
  code: 'QUOTA_EXCEEDED';
  tier: Tier;
  retryAfterSeconds?: number;
}

export type WorkflowStep = 'landing' | 'upload' | 'processing' | 'review' | 'download' | 'account-request';
