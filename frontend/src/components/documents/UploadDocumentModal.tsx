import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { UploadCloud } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input, Label, Select } from "../ui/Input";
import { ErrorBanner } from "../ui/Feedback";
import { DocumentAPI, apiErrorMessage } from "../../lib/api";
import type { DocumentT, ExtractedField } from "../../types";

const DOC_TYPES = [
  { value: "FIR", label: "FIR" },
  { value: "chargesheet", label: "Chargesheet" },
  { value: "witness_statement", label: "Witness Statement" },
  { value: "forensic_report", label: "Forensic Report" },
  { value: "judgment", label: "Judgment" },
  { value: "other", label: "Other" },
];

const SENSITIVITY = ["public", "restricted", "confidential", "secret"];

export function UploadDocumentModal({
  caseId,
  onClose,
  onUploaded,
}: {
  caseId: string;
  onClose: () => void;
  onUploaded: (doc: DocumentT, extractedFields: ExtractedField[]) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState("FIR");
  const [sensitivity, setSensitivity] = useState("restricted");
  const [language, setLanguage] = useState("en");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Select a document file to upload.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title || file.name);
      formData.append("docType", docType);
      formData.append("sensitivity", sensitivity);
      formData.append("language", language);

      const res = await DocumentAPI.upload(caseId, formData);
      onUploaded(res.document, res.extractedFields);
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Upload document" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <Label>Document file</Label>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-border py-6 hover:border-primary/40 hover:bg-background transition-colors"
          >
            <UploadCloud className="h-6 w-6 text-text-secondary" />
            <span className="text-[13px] text-text-secondary">
              {file ? file.name : "Click to select a PDF or scanned image"}
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.txt"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] || null;
              setFile(f);
              if (f && !title) setTitle(f.name);
            }}
          />
        </div>

        <div>
          <Label htmlFor="title">Document title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. FIR — Cyber Fraud Complaint" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="docType">Document type</Label>
            <Select id="docType" value={docType} onChange={(e) => setDocType(e.target.value)}>
              {DOC_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="sensitivity">Sensitivity</Label>
            <Select id="sensitivity" value={sensitivity} onChange={(e) => setSensitivity(e.target.value)}>
              {SENSITIVITY.map((s) => (
                <option key={s} value={s}>
                  {s[0].toUpperCase() + s.slice(1)}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="language">Source language</Label>
          <Select id="language" value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="ta">Tamil</option>
            <option value="te">Telugu</option>
            <option value="bn">Bengali</option>
            <option value="mr">Marathi</option>
          </Select>
        </div>

        <p className="text-[12px] text-text-secondary bg-background border border-border rounded-sm px-3 py-2">
          Upload triggers automatic translation and NER field extraction. The document remains locked
          from AI search until an authorized officer completes human verification.
        </p>

        {error && <ErrorBanner message={error} />}

        <div className="flex justify-end gap-2 mt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Upload &amp; process
          </Button>
        </div>
      </form>
    </Modal>
  );
}
