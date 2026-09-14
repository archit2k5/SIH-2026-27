import { useState } from "react";
import { Link2 } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input, Label } from "../ui/Input";
import { ErrorBanner } from "../ui/Feedback";
import { DocumentAPI, apiErrorMessage } from "../../lib/api";

export function ShareDocumentModal({
  documentId,
  onClose,
}: {
  documentId: string;
  onClose: () => void;
}) {
  const [hours, setHours] = useState(24);
  const [watermark, setWatermark] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  async function handleGenerate() {
    setError(null);
    setLoading(true);
    try {
      const res = await DocumentAPI.share(documentId, hours, watermark || undefined);
      setResultUrl(res.shareUrl);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Create secure share link" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="text-[13px] text-text-secondary">
          Generates a time-limited, watermarked, read-only link for external stakeholders such as
          defense counsel during trial.
        </p>
        <div>
          <Label htmlFor="hours">Expires after (hours)</Label>
          <Input
            id="hours"
            type="number"
            min={1}
            max={720}
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
          />
        </div>
        <div>
          <Label htmlFor="watermark">Watermark text (optional)</Label>
          <Input
            id="watermark"
            value={watermark}
            onChange={(e) => setWatermark(e.target.value)}
            placeholder="RESTRICTED — VIEWED BY EXTERNAL COUNSEL"
          />
        </div>

        {error && <ErrorBanner message={error} />}

        {resultUrl ? (
          <div className="rounded-sm border border-secondary/30 bg-secondary/5 px-3 py-2.5 flex items-start gap-2">
            <Link2 className="h-4 w-4 text-secondary mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-[12px] text-text-secondary mb-1">Share link created (expires in {hours}h):</p>
              <p className="text-[12px] font-mono-num text-text-primary break-all">{resultUrl}</p>
            </div>
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
          {!resultUrl && (
            <Button type="button" loading={loading} onClick={handleGenerate}>
              Generate link
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
