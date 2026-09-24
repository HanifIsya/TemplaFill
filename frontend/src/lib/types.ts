/**
 * TemplaFill Data Models & Types
 * Matching docs/2-architecture/API.md and DATA_MODEL.md
 */

export type TemplateFormat = 'docx' | 'xlsx' | 'pptx' | 'pdf';

export type JobStatusType = 'pending' | 'extracting' | 'embedding' | 'mapping' | 'completed' | 'failed';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

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
  extractedBy?: 'gemini' | 'heuristic' | 'manual';
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
  engineUsed?: 'gemini' | 'heuristic' | 'hybrid' | 'mock';
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

export interface RecentSession {
  sessionId: string;
  sourceFilename: string;
  templateFilename: string;
  date: string;
  fieldCount: number;
  downloadFilename: string;
}

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  tier: 'free' | 'pro' | 'enterprise';
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

export type WorkflowStep = 'landing' | 'upload' | 'processing' | 'review' | 'download';
