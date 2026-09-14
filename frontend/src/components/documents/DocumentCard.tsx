import { AlertTriangle, FileText, ShieldCheck } from "lucide-react";
import type { DocumentT } from "../../types";
import { cn, docTypeLabel, formatDate } from "../../lib/utils";
import { Badge } from "../ui/Badge";

export function DocumentCard({
  document,
  selected,
  onClick,
}: {
  document: DocumentT;
  selected: boolean;
  onClick: () => void;
}) {
  const accent = document.verified ? "border-l-secondary" : "border-l-warning";

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-md border border-border bg-surface px-4 py-3 border-l-[3px] transition-colors",
        accent,
        selected ? "ring-1 ring-primary border-primary/40" : "hover:border-primary/30"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <FileText className="h-4 w-4 text-text-secondary mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-[14px] font-medium text-text-primary truncate">{document.title}</p>
            <p className="text-[12px] text-text-secondary mt-0.5">
              {docTypeLabel(document.doc_type)} · v{document.current_version || 1}
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between mt-2.5">
        {document.verified ? (
          <Badge tone="success" icon={<ShieldCheck className="h-3 w-3" />}>
            Verified
          </Badge>
        ) : (
          <Badge tone="warning" icon={<AlertTriangle className="h-3 w-3" />}>
            Pending Verification
          </Badge>
        )}
        <span className="text-[11px] text-text-secondary font-mono-num">{formatDate(document.created_at)}</span>
      </div>
    </button>
  );
}
