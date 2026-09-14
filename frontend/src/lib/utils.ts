export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

export function truncateHash(hash: string | null | undefined, chars = 10): string {
  if (!hash) return "—";
  if (hash.length <= chars * 2) return hash;
  return `${hash.slice(0, chars)}…${hash.slice(-4)}`;
}

export function initials(name: string | undefined): string {
  if (!name) return "?";
  const cleaned = name
    .replace(/\([^)]*\)/g, "")
    .replace(/[^A-Za-z\s]/g, "")
    .trim();
  if (!cleaned) return "?";
  const parts = cleaned.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function docTypeLabel(docType: string): string {
  const map: Record<string, string> = {
    FIR: "FIR",
    chargesheet: "Chargesheet",
    witness_statement: "Witness Statement",
    forensic_report: "Forensic Report",
    judgment: "Judgment",
    other: "Other Document",
  };
  return map[docType] || docType;
}

export function caseStatusLabel(status: string): string {
  const map: Record<string, string> = {
    open: "Open",
    under_trial: "Under Trial",
    closed: "Closed",
  };
  return map[status] || status;
}

export function ledgerActionLabel(action: string): string {
  const map: Record<string, string> = {
    UPLOAD: "Uploaded",
    TRANSLATE: "Translated",
    EXTRACT: "Fields Extracted",
    VERIFY: "Verified & Signed",
    VIEW: "Viewed",
    EDIT: "Edited",
    APPROVE: "Approved",
    SHARE: "Share Link Created",
  };
  return map[action] || action;
}
