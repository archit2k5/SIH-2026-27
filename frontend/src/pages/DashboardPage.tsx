import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FolderOpen, Plus, Search } from "lucide-react";
import { CaseAPI, apiErrorMessage } from "../lib/api";
import type { Case, CaseStatus } from "../types";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Input } from "../components/ui/Input";
import { PageSpinner, EmptyState, ErrorBanner } from "../components/ui/Feedback";
import { CreateCaseModal } from "../components/cases/CreateCaseModal";
import { caseStatusLabel, formatDate } from "../lib/utils";

const statusTone: Record<CaseStatus, "success" | "warning" | "neutral"> = {
  open: "success",
  under_trial: "warning",
  closed: "neutral",
};

export function DashboardPage() {
  const navigate = useNavigate();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    load();
  }, []);

  function load() {
    setLoading(true);
    setError(null);
    CaseAPI.list()
      .then((res) => setCases(res.cases))
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cases;
    return cases.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.case_number.toLowerCase().includes(q) ||
        (c.description || "").toLowerCase().includes(q)
    );
  }, [cases, search]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-[28px] font-bold text-text-primary leading-tight">Cases</h1>
          <p className="text-[14px] text-text-secondary mt-1">
            Every document, verification, and access grant is anchored to a case.
          </p>
        </div>
        <Button icon={<Plus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>
          Open new case
        </Button>
      </div>

      <div className="relative mb-5 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by case number or title…"
          className="pl-9"
        />
      </div>

      {loading ? (
        <PageSpinner label="Loading cases…" />
      ) : error ? (
        <ErrorBanner message={error} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="h-8 w-8" />}
          title={cases.length === 0 ? "No cases yet" : "No cases match your search"}
          description={
            cases.length === 0
              ? "Open a case to start uploading FIRs, statements, and reports for investigation."
              : "Try a different case number or keyword."
          }
          action={
            cases.length === 0 ? (
              <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setShowCreate(true)}>
                Open new case
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => navigate(`/cases/${c.id}`)}
              className="text-left bg-surface border border-border rounded-md p-5 hover:border-primary/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <span className="font-mono-num text-[12px] text-text-secondary">{c.case_number}</span>
                <Badge tone={statusTone[c.status]}>{caseStatusLabel(c.status)}</Badge>
              </div>
              <h3 className="text-[16px] font-semibold text-text-primary leading-snug mb-1.5">
                {c.title}
              </h3>
              {c.description && (
                <p className="text-[13px] text-text-secondary line-clamp-2 mb-3">{c.description}</p>
              )}
              <p className="text-[12px] text-text-secondary/80">Opened {formatDate(c.created_at)}</p>
            </button>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateCaseModal
          onClose={() => setShowCreate(false)}
          onCreated={(c) => setCases((prev) => [c, ...prev])}
        />
      )}
    </div>
  );
}
