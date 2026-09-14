import { useState } from "react";
import type { FormEvent } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input, Label, Select } from "../ui/Input";
import { ErrorBanner } from "../ui/Feedback";
import { CaseAPI, apiErrorMessage } from "../../lib/api";
import type { CaseAccessGrant } from "../../types";

export function GrantAccessModal({
  caseId,
  onClose,
  onGranted,
}: {
  caseId: string;
  onClose: () => void;
  onGranted: (grant: CaseAccessGrant) => void;
}) {
  const [userId, setUserId] = useState("");
  const [accessLevel, setAccessLevel] = useState("read");
  const [expiresAt, setExpiresAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await CaseAPI.grantAccess(caseId, {
        userId,
        accessLevel,
        expiresAt: expiresAt || null,
      });
      onGranted(res.grant);
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Grant case access" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <Label htmlFor="userId">User ID</Label>
          <Input
            id="userId"
            required
            autoFocus
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="UUID — find under Admin → Users"
          />
        </div>
        <div>
          <Label htmlFor="accessLevel">Access level</Label>
          <Select id="accessLevel" value={accessLevel} onChange={(e) => setAccessLevel(e.target.value)}>
            <option value="read">Read</option>
            <option value="write">Write</option>
            <option value="approve">Approve</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="expiresAt">Expires (optional)</Label>
          <Input id="expiresAt" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
        </div>
        {error && <ErrorBanner message={error} />}
        <div className="flex justify-end gap-2 mt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Grant access
          </Button>
        </div>
      </form>
    </Modal>
  );
}
