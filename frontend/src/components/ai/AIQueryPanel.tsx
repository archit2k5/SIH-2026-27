import { useState } from "react";
import type { FormEvent } from "react";
import { AlertTriangle, Search, Sparkles } from "lucide-react";
import { AIAPI, apiErrorMessage } from "../../lib/api";
import type { AIQueryResult } from "../../types";
import { Textarea } from "../ui/Input";
import { Button } from "../ui/Button";
import { ErrorBanner, Spinner } from "../ui/Feedback";
import { docTypeLabel } from "../../lib/utils";

interface Exchange {
  query: string;
  result: AIQueryResult;
}

export function AIQueryPanel({ caseId }: { caseId?: string }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Exchange[]>([]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    try {
      const result = await AIAPI.query(q, caseId);
      setHistory((prev) => [...prev, { query: q, result }]);
      setQuery("");
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-1">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center gap-3 py-16 text-text-secondary">
            <Sparkles className="h-7 w-7" />
            <p className="text-[14px] font-medium text-text-primary">Ask about verified case documents</p>
            <p className="text-[13px] max-w-sm">
              Answers are grounded only in documents that have completed human verification, with
              citations back to the source. Nothing here is legal advice.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6 py-2">
            {history.map((ex, i) => (
              <div key={i} className="flex flex-col gap-2.5">
                <div className="self-end max-w-[85%] rounded-md bg-primary text-white px-4 py-2.5 text-[13px]">
                  {ex.query}
                </div>
                <div className="max-w-[92%] rounded-md border border-border bg-surface px-4 py-3">
                  <p className="text-[13px] text-text-primary whitespace-pre-line">{ex.result.answer}</p>

                  {!ex.result.hasSupportingEvidence && (
                    <p className="flex items-center gap-1.5 text-[12px] text-warning mt-2">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      No verified evidence directly supports this query.
                    </p>
                  )}

                  {ex.result.citations.length > 0 && (
                    <div className="mt-3 flex flex-col gap-1.5">
                      <p className="text-[11px] font-medium text-text-secondary uppercase tracking-wide">
                        Sources
                      </p>
                      {ex.result.citations.map((c, ci) => (
                        <div key={ci} className="rounded-sm bg-background border border-border px-2.5 py-2">
                          <p className="text-[12px] font-medium text-text-primary">
                            {c.documentTitle}{" "}
                            <span className="text-text-secondary font-normal">
                              · {docTypeLabel(c.docType)} · {c.caseNumber}
                            </span>
                          </p>
                          <p className="text-[12px] text-text-secondary mt-0.5 line-clamp-2">{c.excerpt}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-[10px] text-text-secondary/80 mt-3 pt-2 border-t border-border">
                    {ex.result.disclaimer}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
        {loading && (
          <div className="flex items-center gap-2 text-text-secondary py-3">
            <Spinner className="h-4 w-4" />
            <span className="text-[13px]">Retrieving from verified documents…</span>
          </div>
        )}
      </div>

      {error && (
        <div className="pt-2">
          <ErrorBanner message={error} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-2 pt-3 border-t border-border mt-2">
        <Textarea
          rows={1}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e as unknown as FormEvent);
            }
          }}
          placeholder={caseId ? "Ask about this case's verified documents…" : "Ask across all cases you can access…"}
          className="resize-none"
        />
        <Button type="submit" loading={loading} icon={<Search className="h-4 w-4" />} disabled={!query.trim()}>
          Ask
        </Button>
      </form>
    </div>
  );
}
