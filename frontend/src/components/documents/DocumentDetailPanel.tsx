import { Fragment, useEffect, useState } from "react";
import { Download, Share2, ShieldCheck, Sparkles } from "lucide-react";
import type { DocumentT, ExtractedField, LedgerEntry } from "../../types";
import { DocumentAPI, LedgerAPI, AIAPI, apiErrorMessage } from "../../lib/api";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { formatDateTime, docTypeLabel, truncateHash } from "../../lib/utils";
import { LedgerTrail } from "./LedgerTrail";
import { CommentsPanel } from "./CommentsPanel";
import { VerifyDocumentModal } from "./VerifyDocumentModal";
import { ShareDocumentModal } from "./ShareDocumentModal";
import { useAuth } from "../../context/AuthContext";

type Tab = "details" | "ledger" | "notes";

export function DocumentDetailPanel({
  document,
  onDocumentUpdated,
}: {
  document: DocumentT;
  onDocumentUpdated: (doc: DocumentT) => void;
}) {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("details");
  const [fields, setFields] = useState<ExtractedField[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVerify, setShowVerify] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setSummary(null);
    Promise.all([
      DocumentAPI.extractedFields(document.id).catch(() => ({ fields: [] as ExtractedField[] })),
      LedgerAPI.documentLedger(document.id).catch(() => ({ entries: [] as LedgerEntry[] })),
    ])
      .then(([f, l]) => {
        if (!mounted) return;
        setFields(f.fields);
        setLedger(l.entries);
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [document.id]);

  const canVerify =
    !document.verified &&
    user &&
    ["IO", "Prosecutor", "Judge", "Registrar", "Admin"].includes(user.role);

  async function handleSummarize() {
    setSummarizing(true);
    setError(null);
    try {
      const res = await AIAPI.summarize(document.id);
      setSummary(res.summary);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSummarizing(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-4 border-b border-border">
        <p className="text-[16px] font-semibold text-text-primary leading-snug">{document.title}</p>
        <p className="text-[12px] text-text-secondary mt-0.5">{docTypeLabel(document.doc_type)}</p>
        <div className="flex items-center gap-2 mt-2.5">
          {document.verified ? (
            <Badge tone="success" icon={<ShieldCheck className="h-3 w-3" />}>
              Verified
            </Badge>
          ) : (
            <Badge tone="warning">Pending Verification</Badge>
          )}
          {document.sensitivity && <Badge tone="neutral" className="capitalize">{document.sensitivity}</Badge>}
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          <a
            href={DocumentAPI.fileUrl(document.id)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-sm border border-primary px-3 py-1.5 text-[13px] font-medium text-primary hover:bg-primary/5"
          >
            <Download className="h-3.5 w-3.5" />
            View / download
          </a>
          {canVerify && (
            <Button size="sm" icon={<ShieldCheck className="h-3.5 w-3.5" />} onClick={() => setShowVerify(true)}>
              Verify document
            </Button>
          )}
          <Button size="sm" variant="secondary" icon={<Share2 className="h-3.5 w-3.5" />} onClick={() => setShowShare(true)}>
            Share
          </Button>
        </div>
      </div>

      <div className="flex border-b border-border px-2">
        {(["details", "ledger", "notes"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2.5 text-[13px] font-medium capitalize border-b-2 -mb-px transition-colors ${
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            {t === "ledger" ? "Audit trail" : t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {tab === "details" && (
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-[12px] font-medium text-text-secondary mb-2">Provenance</p>
              <dl className="grid grid-cols-[100px_1fr] gap-y-1.5 text-[12px]">
                <dt className="text-text-secondary">Language</dt>
                <dd className="font-mono-num text-text-primary">{document.language}</dd>
                <dt className="text-text-secondary">Version</dt>
                <dd className="font-mono-num text-text-primary">v{document.current_version || 1}</dd>
                <dt className="text-text-secondary">Uploaded</dt>
                <dd className="font-mono-num text-text-primary">{formatDateTime(document.created_at)}</dd>
                <dt className="text-text-secondary">SHA-256</dt>
                <dd className="font-mono-num text-text-primary break-all" title={document.original_hash}>
                  {truncateHash(document.original_hash, 12)}
                </dd>
              </dl>
            </div>

            <div>
              <p className="text-[12px] font-medium text-text-secondary mb-2">Extracted fields</p>
              {loading ? (
                <p className="text-[13px] text-text-secondary">Loading…</p>
              ) : fields.length === 0 ? (
                <p className="text-[13px] text-text-secondary">No structured fields extracted.</p>
              ) : (
                <dl className="grid grid-cols-[100px_1fr] gap-y-1.5 text-[12px]">
                  {fields.map((f, i) => (
                    <Fragment key={i}>
                      <dt className="text-text-secondary capitalize truncate">
                        {f.field_name.replace(/_/g, " ")}
                      </dt>
                      <dd className="text-text-primary break-words">{f.field_value}</dd>
                    </Fragment>
                  ))}
                </dl>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[12px] font-medium text-text-secondary">AI summary</p>
                {document.verified && (
                  <button
                    onClick={handleSummarize}
                    disabled={summarizing}
                    className="flex items-center gap-1 text-[12px] text-secondary hover:underline disabled:opacity-50"
                  >
                    <Sparkles className="h-3 w-3" />
                    {summarizing ? "Summarizing…" : "Generate"}
                  </button>
                )}
              </div>
              {!document.verified ? (
                <p className="text-[13px] text-text-secondary">
                  Available once this document is verified.
                </p>
              ) : summary ? (
                <div className="rounded-sm bg-secondary/5 border border-secondary/20 px-3 py-2.5">
                  <p className="text-[12px] whitespace-pre-line text-text-primary">{summary}</p>
                  <p className="text-[10px] font-medium text-secondary mt-2">AI-assisted — verify before use</p>
                </div>
              ) : (
                <p className="text-[13px] text-text-secondary">Not generated yet.</p>
              )}
            </div>

            {error && <p className="text-[12px] text-danger">{error}</p>}
          </div>
        )}

        {tab === "ledger" && (
          loading ? (
            <p className="text-[13px] text-text-secondary">Loading…</p>
          ) : (
            <LedgerTrail entries={ledger} />
          )
        )}

        {tab === "notes" && <CommentsPanel documentId={document.id} />}
      </div>

      {showVerify && (
        <VerifyDocumentModal
          documentId={document.id}
          initialFields={fields}
          onClose={() => setShowVerify(false)}
          onVerified={(_sig, verifiedFields) => {
            setFields(verifiedFields);
            onDocumentUpdated({ ...document, verified: true });
            LedgerAPI.documentLedger(document.id)
              .then((l) => setLedger(l.entries))
              .catch(() => {});
          }}
        />
      )}
      {showShare && <ShareDocumentModal documentId={document.id} onClose={() => setShowShare(false)} />}
    </div>
  );
}
