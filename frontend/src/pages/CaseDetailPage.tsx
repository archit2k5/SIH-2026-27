import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  FileStack,
  MessagesSquare,
  Plus,
  ScrollText,
  Users,
  Clock,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { CaseAPI, DocumentAPI, apiErrorMessage } from "../lib/api";
import type { Case, CaseAccessGrant, DocumentT, ExtractedField } from "../types";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { PageSpinner, EmptyState, ErrorBanner } from "../components/ui/Feedback";
import { DocumentCard } from "../components/documents/DocumentCard";
import { UploadDocumentModal } from "../components/documents/UploadDocumentModal";
import { DocumentDetailPanel } from "../components/documents/DocumentDetailPanel";
import { AIQueryPanel } from "../components/ai/AIQueryPanel";
import { TimelinePanel } from "../components/cases/TimelinePanel";
import { MembersPanel } from "../components/cases/MembersPanel";
import { AuditReportPanel } from "../components/cases/AuditReportPanel";
import { caseStatusLabel, docTypeLabel } from "../lib/utils";
import { VerifyDocumentModal } from "../components/documents/VerifyDocumentModal";

type CenterTab = "documents" | "ai" | "timeline" | "members" | "audit";

const statusTone: Record<string, "success" | "warning" | "neutral"> = {
  open: "success",
  under_trial: "warning",
  closed: "neutral",
};

export function CaseDetailPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();

  const [caseRecord, setCaseRecord] = useState<Case | null>(null);
  const [members, setMembers] = useState<CaseAccessGrant[]>([]);
  const [documents, setDocuments] = useState<DocumentT[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentT | null>(null);
  const [tab, setTab] = useState<CenterTab>("documents");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [pendingVerifyDoc, setPendingVerifyDoc] = useState<{ doc: DocumentT; fields: ExtractedField[] } | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);

  useEffect(() => {
    if (!caseId) return;
    setLoading(true);
    setError(null);
    Promise.all([CaseAPI.get(caseId), DocumentAPI.listForCase(caseId)])
      .then(([caseRes, docsRes]) => {
        setCaseRecord(caseRes.case);
        setMembers(caseRes.assignedMembers || []);
        setDocuments(docsRes.documents);
      })
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [caseId]);

  if (loading) return <PageSpinner label="Loading case…" />;
  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
        <ErrorBanner message={error} />
      </div>
    );
  }
  if (!caseRecord || !caseId) return null;

  function updateDocument(doc: DocumentT) {
    setDocuments((prev) => prev.map((d) => (d.id === doc.id ? doc : d)));
    setSelectedDoc(doc);
  }

  const tabs: Array<{ id: CenterTab; label: string; icon: ReactNode }> = [
    { id: "documents", label: "Documents", icon: <FileStack className="h-3.5 w-3.5" /> },
    { id: "ai", label: "AI Assistant", icon: <MessagesSquare className="h-3.5 w-3.5" /> },
    { id: "timeline", label: "Timeline", icon: <Clock className="h-3.5 w-3.5" /> },
    { id: "members", label: "Members", icon: <Users className="h-3.5 w-3.5" /> },
    { id: "audit", label: "Audit Report", icon: <ScrollText className="h-3.5 w-3.5" /> },
  ];

  const showRightPanel = tab === "documents" && selectedDoc && panelOpen;

  return (
    <div className="flex h-full min-h-0">
      {/* Left: case + document navigation */}
      <div className="w-[280px] shrink-0 border-r border-border bg-surface flex flex-col min-h-0">
        <div className="px-4 py-4 border-b border-border">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-[12px] text-text-secondary hover:text-text-primary mb-3"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All cases
          </button>
          <p className="font-mono-num text-[12px] text-text-secondary">{caseRecord.case_number}</p>
          <h1 className="text-[16px] font-semibold text-text-primary leading-snug mt-0.5">
            {caseRecord.title}
          </h1>
          <Badge tone={statusTone[caseRecord.status]} className="mt-2">
            {caseStatusLabel(caseRecord.status)}
          </Badge>
        </div>

        <div className="flex flex-col px-2 py-2 border-b border-border">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 rounded-sm px-2.5 py-2 text-[13px] font-medium transition-colors ${tab === t.id
                ? "bg-primary/10 text-primary"
                : "text-text-secondary hover:bg-black/5 hover:text-text-primary"
                }`}
            >
              {t.icon}
              {t.label}
              {t.id === "documents" && documents.length > 0 && (
                <span className="ml-auto text-[11px] text-text-secondary">{documents.length}</span>
              )}
            </button>
          ))}
        </div>

        {tab === "documents" && (
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="px-3 pt-3 pb-2">
              <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} className="w-full" onClick={() => setShowUpload(true)}>
                Upload document
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-2">
              {documents.length === 0 ? (
                <p className="text-[12px] text-text-secondary text-center py-6">
                  No documents uploaded to this case yet.
                </p>
              ) : (
                documents.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    document={doc}
                    selected={selectedDoc?.id === doc.id}
                    onClick={() => setSelectedDoc(doc)}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Center: routed content for the active tab */}
      <div className="flex-1 min-w-0 min-h-0 overflow-y-auto px-6 py-6">
        {tab === "documents" &&
          (selectedDoc ? (
            <DocumentPreview document={selectedDoc} />
          ) : (
            <EmptyState
              icon={<FileStack className="h-7 w-7" />}
              title="Select a document"
              description={
                documents.length === 0
                  ? "Upload the first document to begin building this case's evidentiary record."
                  : "Choose a document from the list to review its content, verification status, and audit trail."
              }
              action={
                documents.length === 0 ? (
                  <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setShowUpload(true)}>
                    Upload document
                  </Button>
                ) : undefined
              }
            />
          ))}
        {tab === "ai" && (
          <div className="h-full max-w-3xl mx-auto">
            <AIQueryPanel caseId={caseId} />
          </div>
        )}
        {tab === "timeline" && <TimelinePanel caseId={caseId} />}
        {tab === "members" && <MembersPanel caseId={caseId} members={members} onMembersChange={setMembers} />}
        {tab === "audit" && <AuditReportPanel caseId={caseId} />}
      </div>

      {/* Right: contextual metadata / ledger / notes for the focused document */}
      {tab === "documents" && selectedDoc && (
        <div className="relative shrink-0">
          <button
            onClick={() => setPanelOpen((v) => !v)}
            className="absolute -left-8 top-4 z-10 flex h-7 w-7 items-center justify-center rounded-sm border border-border bg-surface text-text-secondary hover:text-text-primary"
            title={panelOpen ? "Collapse panel" : "Expand panel"}
          >
            {panelOpen ? <PanelRightClose className="h-3.5 w-3.5" /> : <PanelRightOpen className="h-3.5 w-3.5" />}
          </button>
          {showRightPanel && (
            <div className="w-[320px] h-full border-l border-border bg-surface">
              <DocumentDetailPanel document={selectedDoc} onDocumentUpdated={updateDocument} />
            </div>
          )}
        </div>
      )}

      {showUpload && (
        <UploadDocumentModal
          caseId={caseId}
          onClose={() => setShowUpload(false)}
          onUploaded={(doc: DocumentT, fields: ExtractedField[]) => {
            setDocuments((prev) => [doc, ...prev]);
            setSelectedDoc(doc);
            setPendingVerifyDoc({ doc, fields });
          }}
        />
      )}

      {pendingVerifyDoc && (
        <VerifyDocumentModal
          documentId={pendingVerifyDoc.doc.id}
          initialFields={pendingVerifyDoc.fields}
          onClose={() => setPendingVerifyDoc(null)}
          onVerified={(_sig, verifiedFields) => {
            setDocuments((prev) =>
              prev.map((d) => (d.id === pendingVerifyDoc.doc.id ? { ...d, verified: true } : d))
            );
            setSelectedDoc((prev) => (prev?.id === pendingVerifyDoc.doc.id ? { ...prev, verified: true } : prev));
            setPendingVerifyDoc(null);
          }}
        />
      )}
    </div>
  );
}

function DocumentPreview({ document }: { document: DocumentT }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>("");
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    setBlobUrl(null);
    setPreviewError(null);
    DocumentAPI.downloadFile(document.id)
      .then((res) => {
        if (cancelled) return;
        const type = String(res.headers["content-type"] || "application/octet-stream");
        setMimeType(type);
        const blob = new Blob([res.data], { type });
        url = URL.createObjectURL(blob);
        setBlobUrl(url);
      })
      .catch(() => !cancelled && setPreviewError("Unable to load a preview for this document."));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [document.id]);

  const isImage = mimeType.startsWith("image/");
  const isPdf = mimeType === "application/pdf";

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-4">
      <div>
        <p className="text-[12px] text-text-secondary">{docTypeLabel(document.doc_type)}</p>
        <h2 className="text-[20px] font-semibold text-text-primary leading-snug">{document.title}</h2>
      </div>
      <div className="rounded-md border border-border bg-surface overflow-hidden">
        {previewError ? (
          <div className="flex flex-col items-center justify-center gap-2 py-20 text-text-secondary">
            <p className="text-[13px]">{previewError}</p>
          </div>
        ) : !blobUrl ? (
          <div className="flex items-center justify-center py-20">
            <PageSpinner label="Loading document…" />
          </div>
        ) : isPdf ? (
          <iframe src={blobUrl} title={document.title} className="w-full h-[75vh]" />
        ) : isImage ? (
          <img src={blobUrl} alt={document.title} className="w-full h-auto" />
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-text-secondary">
            <p className="text-[13px]">Preview not available for this file type.</p>
            <a href={blobUrl} download={document.title} className="text-[13px] text-secondary hover:underline">
              Download to view
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
