export type Role =
  | "IO"
  | "Prosecutor"
  | "Judge"
  | "Forensic Expert"
  | "Registrar"
  | "Admin";

export type AccessLevel = "read" | "write" | "approve";

export type CaseStatus = "open" | "under_trial" | "closed";

export type DocType =
  | "FIR"
  | "chargesheet"
  | "witness_statement"
  | "forensic_report"
  | "judgment"
  | "other";

export type Sensitivity = "public" | "restricted" | "confidential" | "secret";

export type LedgerAction =
  | "UPLOAD"
  | "TRANSLATE"
  | "EXTRACT"
  | "VERIFY"
  | "VIEW"
  | "EDIT"
  | "APPROVE"
  | "SHARE";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  public_key?: string | null;
  publicKey?: string | null;
  mfa_enabled?: boolean;
  mfaEnabled?: boolean;
  created_at?: string;
}

export interface Case {
  id: string;
  case_number: string;
  title: string;
  description?: string;
  status: CaseStatus;
  created_by: string;
  created_at: string;
}

export interface CaseAccessGrant {
  case_id: string;
  user_id: string;
  access_level: AccessLevel;
  expires_at: string | null;
  granted_by?: string;
  user_name?: string;
  user_role?: Role;
  name?: string;
  email?: string;
  role?: Role;
}

export interface DocumentT {
  id: string;
  case_id: string;
  doc_type: DocType;
  title: string;
  storage_path: string;
  original_hash: string;
  language: string;
  verified: boolean;
  current_version: number;
  sensitivity?: Sensitivity;
  uploaded_by?: string;
  created_at: string;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  storage_path: string;
  hash: string;
  created_by: string;
  change_summary?: string;
  created_at: string;
}

export interface ExtractedField {
  id?: string;
  document_id: string;
  field_name: string;
  field_value: string;
  confidence: number;
  verified_by?: string | null;
}

export interface LedgerEntry {
  id: number;
  document_id: string | null;
  action: LedgerAction;
  actor_id: string;
  timestamp: string;
  document_hash: string;
  previous_entry_hash: string;
  this_entry_hash: string;
  signature: string | null;
  metadata: Record<string, unknown> | string;
  actor_name?: string;
  actor_role?: Role;
}

export interface ChainVerification {
  valid: boolean;
  totalEntries: number;
  brokenIndex: number | null;
  brokenEntryId: number | string | null;
  reason?: string;
}

export interface AIQueryLog {
  id: string;
  user_id: string;
  case_id: string | null;
  query_text: string;
  retrieved_chunk_ids: string[];
  response_text: string;
  timestamp: string;
}

export interface Citation {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  docType: DocType;
  caseNumber: string;
  excerpt: string;
}

export interface AIQueryResult {
  disclaimer: string;
  answer: string;
  citations: Citation[];
  hasSupportingEvidence: boolean;
  retrievedChunksCount?: number;
}

export interface TimelineEvent {
  date: string;
  event: string;
  sourceRef: string;
  documentId: string;
}

export interface Comment {
  id: string;
  document_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author_name?: string;
  author_role?: Role;
  user_name?: string;
  user_role?: Role;
}

export interface Notification {
  id: string;
  user_id: string;
  case_id: string | null;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface SystemHealth {
  status: "HEALTHY" | "DEGRADED";
  timestamp: string;
  uptime: number;
  database: { status: string; latencyMs: number };
  storage: { type: string; uploadDir: string; healthy: boolean };
  ledger: { chainStatus: string; totalEntries: number; tamperDetected: boolean };
  aiService: { status: string; ragIndexCount: string | number };
  statistics: {
    totalCases: number;
    totalDocuments: number;
    totalLedgerEntries: number;
    totalUsers: number;
  };
}
