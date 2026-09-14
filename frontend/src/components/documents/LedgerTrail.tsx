import { AlertTriangle } from "lucide-react";
import type { LedgerEntry } from "../../types";
import { formatDateTime, ledgerActionLabel, truncateHash } from "../../lib/utils";

export function LedgerTrail({ entries, brokenIds = [] }: { entries: LedgerEntry[]; brokenIds?: Array<number | string> }) {
  if (entries.length === 0) {
    return <p className="text-[13px] text-text-secondary py-4">No ledger entries recorded yet.</p>;
  }

  return (
    <div className="flex flex-col">
      {entries.map((entry, i) => {
        const broken = brokenIds.includes(entry.id);
        return (
          <div
            key={entry.id}
            className={`px-3 py-2.5 border-b border-border last:border-b-0 ${
              broken ? "bg-danger/10" : i % 2 === 0 ? "bg-surface" : "bg-background"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-medium text-text-primary">
                {ledgerActionLabel(entry.action)}
              </span>
              {broken && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-danger">
                  <AlertTriangle className="h-3 w-3" />
                  Integrity failure
                </span>
              )}
            </div>
            <p className="text-[12px] text-text-secondary mt-0.5">
              {entry.actor_name || entry.actor_id} · {entry.actor_role || ""}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5 text-[11px] font-mono-num text-text-secondary/90">
              <span>#{entry.id}</span>
              <span>{formatDateTime(entry.timestamp)}</span>
              <span title={entry.this_entry_hash}>hash {truncateHash(entry.this_entry_hash)}</span>
            </div>
            {entry.signature && (
              <p className="text-[11px] font-mono-num text-secondary mt-1 truncate" title={entry.signature}>
                signed {truncateHash(entry.signature, 8)}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
