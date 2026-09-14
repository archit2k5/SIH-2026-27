import { useState } from "react";
import { PenLine, ShieldCheck } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input, Label } from "../ui/Input";
import { ErrorBanner } from "../ui/Feedback";
import { DocumentAPI, apiErrorMessage } from "../../lib/api";
import type { ExtractedField } from "../../types";

export function VerifyDocumentModal({
  documentId,
  initialFields,
  onClose,
  onVerified,
}: {
  documentId: string;
  initialFields: ExtractedField[];
  onClose: () => void;
  onVerified: (digitalSignature: string, fields: ExtractedField[]) => void;
}) {
  const [fields, setFields] = useState<ExtractedField[]>(
    initialFields.length > 0
      ? initialFields
      : [{ document_id: documentId, field_name: "", field_value: "", confidence: 1 }]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField(index: number, key: "field_name" | "field_value", value: string) {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, [key]: value } : f)));
  }

  function addField() {
    setFields((prev) => [...prev, { document_id: documentId, field_name: "", field_value: "", confidence: 1 }]);
  }

  function removeField(index: number) {
    setFields((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleVerify() {
    setError(null);
    setLoading(true);
    try {
      const res = await DocumentAPI.verify(documentId, fields.filter((f) => f.field_name.trim() !== ""));
      onVerified(res.digitalSignature, res.verifiedFields);
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Human verification" onClose={onClose} width="max-w-xl">
      <div className="flex flex-col gap-4">
        <p className="text-[13px] text-text-secondary">
          Confirm or correct the fields extracted by NER before signing. This document will remain
          locked from AI search until verification is complete.
        </p>

        <div className="flex flex-col gap-2">
          {fields.map((f, i) => (
            <div key={i} className="flex gap-2 items-end">
              <div className="flex-1">
                {i === 0 && <Label>Field</Label>}
                <Input
                  value={f.field_name}
                  onChange={(e) => updateField(i, "field_name", e.target.value)}
                  placeholder="e.g. case_number"
                />
              </div>
              <div className="flex-[1.4]">
                {i === 0 && <Label>Value</Label>}
                <Input
                  value={f.field_value}
                  onChange={(e) => updateField(i, "field_value", e.target.value)}
                  placeholder="Extracted value"
                />
              </div>
              <button
                type="button"
                onClick={() => removeField(i)}
                className="h-9 px-2 text-[12px] text-text-secondary hover:text-danger"
              >
                Remove
              </button>
            </div>
          ))}
          <Button type="button" variant="secondary" size="sm" onClick={addField} className="self-start mt-1">
            + Add field
          </Button>
        </div>

        <div className="rounded-sm border border-border bg-background px-3 py-2.5 flex items-start gap-2">
          <PenLine className="h-4 w-4 text-text-secondary mt-0.5 shrink-0" />
          <p className="text-[12px] text-text-secondary">
            Confirming will bind your identity to this document version with a digital signature,
            written as a <span className="font-mono-num">VERIFY</span> entry to the hash-chain ledger
            (IT Act 2000 non-repudiation).
          </p>
        </div>

        {error && <ErrorBanner message={error} />}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            icon={<ShieldCheck className="h-4 w-4" />}
            loading={loading}
            onClick={handleVerify}
          >
            Confirm &amp; sign
          </Button>
        </div>
      </div>
    </Modal>
  );
}
