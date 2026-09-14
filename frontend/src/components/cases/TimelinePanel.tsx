import { useState } from "react";
import { Clock, Sparkles } from "lucide-react";
import type { TimelineEvent } from "../../types";
import { AIAPI, apiErrorMessage } from "../../lib/api";
import { Button } from "../ui/Button";
import { ErrorBanner, EmptyState } from "../ui/Feedback";
import { formatDate } from "../../lib/utils";

export function TimelinePanel({ caseId }: { caseId: string }) {
  const [events, setEvents] = useState<TimelineEvent[] | null>(null);
  const [disclaimer, setDisclaimer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await AIAPI.timeline(caseId);
      setEvents(res.timeline);
      setDisclaimer(res.disclaimer);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[16px] font-semibold text-text-primary">Case timeline</h3>
          <p className="text-[13px] text-text-secondary mt-0.5">
            AI-assembled chronology from verified documents in this case.
          </p>
        </div>
        <Button size="sm" icon={<Sparkles className="h-3.5 w-3.5" />} loading={loading} onClick={generate}>
          {events ? "Regenerate" : "Generate timeline"}
        </Button>
      </div>

      {error && <ErrorBanner message={error} />}

      {!events && !loading && !error && (
        <EmptyState
          icon={<Clock className="h-7 w-7" />}
          title="No timeline generated yet"
          description="Generate a chronological view assembled from every verified document's extracted dates and events."
        />
      )}

      {events && (
        <div className="flex flex-col">
          {events.length === 0 ? (
            <p className="text-[13px] text-text-secondary">No dated events found in verified documents.</p>
          ) : (
            events.map((ev, i) => (
              <div key={i} className="flex gap-4 pb-6 last:pb-0">
                <div className="flex flex-col items-center">
                  <span className="h-2.5 w-2.5 rounded-full bg-primary mt-1.5" />
                  {i < events.length - 1 && <span className="w-px flex-1 bg-border mt-1" />}
                </div>
                <div className="pb-1">
                  <p className="text-[12px] font-mono-num text-text-secondary">{formatDate(ev.date)}</p>
                  <p className="text-[14px] text-text-primary mt-0.5">{ev.event}</p>
                  <p className="text-[11px] text-text-secondary/80 mt-0.5">Source: {ev.sourceRef}</p>
                </div>
              </div>
            ))
          )}
          {disclaimer && (
            <p className="text-[11px] text-text-secondary/80 pt-2 border-t border-border mt-1">{disclaimer}</p>
          )}
        </div>
      )}
    </div>
  );
}
