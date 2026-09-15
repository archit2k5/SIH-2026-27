import axios, { AxiosError } from "axios";
import type {
  AIQueryLog,
  AIQueryResult,
  CaseAccessGrant,
  ChainVerification,
  Comment,
  DocumentT,
  DocumentVersion,
  ExtractedField,
  LedgerEntry,
  Notification,
  SystemHealth,
  TimelineEvent,
  Case,
  Role,
  User,
} from "../types";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api/v1";

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

const TOKEN_KEY = "sih_dms_access_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface ApiEnvelope<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}

export function apiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const e = err as AxiosError<{ message?: string }>;
    return e.response?.data?.message || e.message || "Something went wrong.";
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}

async function unwrap<T>(promise: Promise<{ data: ApiEnvelope<T> }>): Promise<T> {
  const res = await promise;
  return res.data.data;
}

// ---------- Auth ----------
export const AuthAPI = {
  login: (email: string, password: string) =>
    unwrap<{
      requiresMfa?: boolean;
      mfaToken?: string;
      demoOtp?: string;
      user?: User;
      accessToken?: string;
      refreshToken?: string;
    }>(api.post("/auth/login", { email, password })),

  verifyMfa: (mfaToken: string, otp: string) =>
    unwrap<{ user: User; accessToken: string; refreshToken: string }>(
      api.post("/auth/mfa/verify", { mfaToken, otp })
    ),

  setupMfa: () => unwrap<{ mfaSecret: string; currentOtp: string }>(api.post("/auth/mfa/setup")),

  logout: () => unwrap<Record<string, never>>(api.post("/auth/logout")),

  me: () => unwrap<{ user: User }>(api.get("/auth/me")),
};

// ---------- Cases ----------
export const CaseAPI = {
  list: () => unwrap<{ cases: Case[]; total: number }>(api.get("/cases")),

  create: (payload: { caseNumber: string; title: string; description?: string; status?: string }) =>
    unwrap<{ case: Case }>(api.post("/cases", payload)),

  get: (caseId: string) =>
    unwrap<{ case: Case; assignedMembers: CaseAccessGrant[] }>(api.get(`/cases/${caseId}`)),

  grantAccess: (
    caseId: string,
    payload: { userId: string; accessLevel: string; expiresAt?: string | null }
  ) => unwrap<{ grant: CaseAccessGrant }>(api.post(`/cases/${caseId}/access`, payload)),

  revokeAccess: (caseId: string, userId: string) =>
    unwrap<{ revoked: boolean }>(api.delete(`/cases/${caseId}/access/${userId}`)),

  listAccess: (caseId: string) =>
    unwrap<{ accessList: CaseAccessGrant[] }>(api.get(`/cases/${caseId}/access`)),
};

// ---------- Documents ----------
export const DocumentAPI = {
  upload: (caseId: string, formData: FormData) =>
    unwrap<{
      document: DocumentT;
      extractedFields: ExtractedField[];
      detectedLanguage: string;
      ledgerEntry: LedgerEntry;
    }>(
      api.post(`/cases/${caseId}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
    ),

  listForCase: (caseId: string, onlyVerified = false) =>
    unwrap<{ documents: DocumentT[]; total: number }>(
      api.get(`/cases/${caseId}/documents`, { params: onlyVerified ? { verified: "true" } : {} })
    ),

  get: (documentId: string) =>
    unwrap<{ document: DocumentT; currentVersion: DocumentVersion | null; extractedFields: ExtractedField[] }>(
      api.get(`/documents/${documentId}`)
    ),

  versions: (documentId: string) =>
    unwrap<{ versions: DocumentVersion[] }>(api.get(`/documents/${documentId}/versions`)),

  // Session cookie (set on login/MFA verify) rides along on this top-level
  // navigation automatically, so a plain link/open works without exposing
  // the bearer token in a URL.
  fileUrl: (documentId: string, version?: number) => {
    const qs = version ? `?version=${version}` : "";
    return `${BASE_URL}/documents/${documentId}/file${qs}`;
  },

  downloadFile: (documentId: string, version?: number) =>
    api.get(`/documents/${documentId}/file`, {
      params: version ? { version } : {},
      responseType: "blob",
    }),

  translation: (documentId: string) =>
    unwrap<{ documentId: string; sourceLanguage: string; translationStatus: string; note: string }>(
      api.get(`/documents/${documentId}/translation`)
    ),

  extractedFields: (documentId: string) =>
    unwrap<{ fields: ExtractedField[]; isVerified: boolean }>(
      api.get(`/documents/${documentId}/extracted-fields`)
    ),

  verify: (documentId: string, confirmedFields: ExtractedField[]) =>
    unwrap<{
      documentId: string;
      verified: boolean;
      digitalSignature: string;
      ledgerEntry: LedgerEntry;
      verifiedFields: ExtractedField[];
    }>(
      api.post(`/documents/${documentId}/verify`, {
        // Backend's verifyFields() reads camelCase fieldName/fieldValue specifically,
        // while every other endpoint uses snake_case — map explicitly for this call.
        confirmedFields: confirmedFields.map((f) => ({
          fieldName: f.field_name,
          fieldValue: f.field_value,
        })),
      })
    ),

  share: (documentId: string, durationHours: number, watermarkText?: string) =>
    unwrap<{ shareRecord: unknown; shareUrl: string; expiresAt: string }>(
      api.post(`/documents/${documentId}/share`, { durationHours, watermarkText })
    ),
};

// ---------- Ledger / Audit ----------
export const LedgerAPI = {
  documentLedger: (documentId: string) =>
    unwrap<{ entries: LedgerEntry[]; count: number }>(api.get(`/documents/${documentId}/ledger`)),

  verifyChain: () => unwrap<ChainVerification & Record<string, unknown>>(api.get("/ledger/verify-chain")),

  auditReport: (caseId: string) => unwrap<{ report: unknown }>(api.get(`/cases/${caseId}/audit-report`)),

  auditReportDownloadUrl: (caseId: string) => `${BASE_URL}/cases/${caseId}/audit-report?format=text`,

  simulateTamper: (ledgerId?: number) =>
    unwrap<{ tamperedLedgerId: number; verificationResult: ChainVerification }>(
      api.post("/ledger/simulate-tamper", ledgerId ? { ledgerId } : {})
    ),
};

// ---------- AI ----------
export const AIAPI = {
  query: (queryText: string, caseId?: string) =>
    unwrap<AIQueryResult>(api.post("/ai/query", { query: queryText, caseId })),

  summarize: (documentId: string) =>
    unwrap<{ disclaimer: string; summary: string; documentId: string; isVerified: boolean }>(
      api.post(`/ai/summarize/${documentId}`)
    ),

  timeline: (caseId: string) =>
    unwrap<{ disclaimer: string; timeline: TimelineEvent[]; totalEvents: number }>(
      api.post(`/ai/timeline/${caseId}`)
    ),

  queryLog: (caseId?: string) =>
    unwrap<{ logs: AIQueryLog[]; count: number }>(api.get("/ai/query-log", { params: caseId ? { caseId } : {} })),
};

// ---------- Collaboration ----------
export const CollaborationAPI = {
  addComment: (documentId: string, content: string) =>
    unwrap<{ comment: Comment }>(api.post(`/documents/${documentId}/comments`, { content })),

  listComments: (documentId: string) =>
    unwrap<{ comments: Comment[]; total: number }>(api.get(`/documents/${documentId}/comments`)),

  caseNotifications: (caseId: string) =>
    unwrap<{ notifications: Notification[] }>(api.get(`/cases/${caseId}/notifications`)),

  myNotifications: (unreadOnly = false) =>
    unwrap<{ notifications: Notification[]; total: number }>(
      api.get("/notifications", { params: unreadOnly ? { unread: "true" } : {} })
    ),

  markRead: (id: string) =>
    unwrap<{ notification: Notification }>(api.patch(`/notifications/${id}/read`)),
};

// ---------- Admin ----------
export const AdminAPI = {
  listUsers: () => unwrap<{ users: User[]; total: number }>(api.get("/admin/users")),

  createUser: (payload: { name: string; email: string; password: string; role: Role; mfaEnabled?: boolean }) =>
    unwrap<{ user: User; keypair: { publicKey: string; privateKey: string; note: string } }>(
      api.post("/admin/users", payload)
    ),

  updateRole: (userId: string, role: Role) =>
    unwrap<{ user: User }>(api.post(`/admin/users/${userId}/role`, { role })),

  systemHealth: () => unwrap<SystemHealth>(api.get("/admin/system-health")),
};
