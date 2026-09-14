import { useState } from "react";
import { UserMinus, UserPlus } from "lucide-react";
import type { CaseAccessGrant } from "../../types";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { EmptyState } from "../ui/Feedback";
import { GrantAccessModal } from "./GrantAccessModal";
import { CaseAPI, apiErrorMessage } from "../../lib/api";
import { formatDate, initials } from "../../lib/utils";

export function MembersPanel({
  caseId,
  members,
  onMembersChange,
}: {
  caseId: string;
  members: CaseAccessGrant[];
  onMembersChange: (members: CaseAccessGrant[]) => void;
}) {
  const [showGrant, setShowGrant] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function revoke(userId: string) {
    setError(null);
    try {
      await CaseAPI.revokeAccess(caseId, userId);
      onMembersChange(members.filter((m) => m.user_id !== userId));
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[16px] font-semibold text-text-primary">Case members</h3>
        <Button size="sm" icon={<UserPlus className="h-3.5 w-3.5" />} onClick={() => setShowGrant(true)}>
          Grant access
        </Button>
      </div>

      {error && <p className="text-[13px] text-danger mb-3">{error}</p>}

      {members.length === 0 ? (
        <EmptyState title="No access grants yet" description="Grant access to bring investigators, prosecutors, or judges onto this case." />
      ) : (
        <div className="flex flex-col gap-2">
          {members.map((m) => (
            <div
              key={m.user_id}
              className="flex items-center justify-between rounded-sm border border-border bg-surface px-4 py-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[12px] font-semibold">
                  {initials(m.user_name || m.name)}
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-text-primary truncate">
                    {m.user_name || m.name || m.user_id}
                  </p>
                  <p className="text-[12px] text-text-secondary">
                    {m.user_role || m.role} {m.expires_at ? `· expires ${formatDate(m.expires_at)}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge tone="primary" className="capitalize">{m.access_level}</Badge>
                <button
                  onClick={() => revoke(m.user_id)}
                  className="text-text-secondary hover:text-danger rounded-sm p-1.5 hover:bg-danger/5"
                  aria-label="Revoke access"
                  title="Revoke access"
                >
                  <UserMinus className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showGrant && (
        <GrantAccessModal
          caseId={caseId}
          onClose={() => setShowGrant(false)}
          onGranted={(g) => onMembersChange([...members, g])}
        />
      )}
    </div>
  );
}
