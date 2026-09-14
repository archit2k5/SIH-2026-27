import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Send } from "lucide-react";
import { CollaborationAPI, apiErrorMessage } from "../../lib/api";
import type { Comment } from "../../types";
import { formatDateTime, initials } from "../../lib/utils";
import { Textarea } from "../ui/Input";
import { Button } from "../ui/Button";
import { ErrorBanner } from "../ui/Feedback";
import { useAuth } from "../../context/AuthContext";

export function CommentsPanel({ documentId }: { documentId: string }) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    CollaborationAPI.listComments(documentId)
      .then((res) => setComments(res.comments))
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [documentId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await CollaborationAPI.addComment(documentId, content.trim());
      const enriched: Comment = { ...res.comment, user_name: user?.name, user_role: user?.role };
      setComments((prev) => [...prev, enriched]);
      setContent("");
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {loading ? (
        <p className="text-[13px] text-text-secondary">Loading notes…</p>
      ) : comments.length === 0 ? (
        <p className="text-[13px] text-text-secondary">No annotations yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-semibold">
                {initials(c.author_name || c.user_name)}
              </span>
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-[13px] font-medium text-text-primary">
                    {c.author_name || c.user_name || "User"}
                  </span>
                  <span className="text-[11px] text-text-secondary font-mono-num">
                    {formatDateTime(c.created_at)}
                  </span>
                </div>
                <p className="text-[13px] text-text-primary/90 mt-0.5">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <ErrorBanner message={error} />}

      <form onSubmit={handleSubmit} className="flex flex-col gap-2 mt-1">
        <Textarea
          rows={2}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a note or annotation for this document…"
        />
        <Button
          type="submit"
          size="sm"
          variant="secondary"
          icon={<Send className="h-3.5 w-3.5" />}
          loading={submitting}
          disabled={!content.trim()}
          className="self-end"
        >
          Post note
        </Button>
      </form>
    </div>
  );
}
