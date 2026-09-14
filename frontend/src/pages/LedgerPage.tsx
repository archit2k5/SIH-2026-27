import { useState } from "react";
import { FlaskConical, RefreshCcw, ShieldAlert, ShieldCheck } from "lucide-react";
import { LedgerAPI, apiErrorMessage } from "../lib/api";
import type { ChainVerification } from "../types";
import { Button } from "../components/ui/Button";
import { ErrorBanner, PageSpinner } from "../components/ui/Feedback";
import { useAuth } from "../context/AuthContext";

export function LedgerPage() {
  const { user } = useAuth();
  const [result, setResult] = useState<ChainVerification | null>(null);
  const [loading, setLoading] = useState(false);
  const [tampering, setTampering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function check() {
    setLoading(true);
    setError(null);
    try {
      const res = await LedgerAPI.verifyChain();
      setResult(res);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function simulateTamper() {
    setTampering(true);
    setError(null);
    try {
      const res = await LedgerAPI.simulateTamper();
      setResult(res.verificationResult);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setTampering(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="text-[28px] font-bold text-text-primary leading-tight">Ledger integrity</h1>
      <p className="text-[14px] text-text-secondary mt-1 mb-6">
        Every action across every case is written to a single append-only, hash-chained ledger. Each
        entry cryptographically references the previous one — altering any past record breaks the
        chain from that point forward.
      </p>

      <div className="flex gap-2 mb-6">
        <Button icon={<RefreshCcw className="h-4 w-4" />} loading={loading} onClick={check}>
          Verify full chain
        </Button>
        {user?.role === "Admin" && (
          <Button
            variant="secondary"
            icon={<FlaskConical className="h-4 w-4" />}
            loading={tampering}
            onClick={simulateTamper}
          >
            Simulate tamper (demo)
          </Button>
        )}
      </div>

      {error && <ErrorBanner message={error} />}
      {loading && <PageSpinner label="Walking the hash chain…" />}

      {result && !loading && (
        <div
          className={`rounded-md border px-5 py-4 flex items-start gap-3 ${
            result.valid ? "border-secondary/30 bg-secondary/5" : "border-danger/30 bg-danger/5"
          }`}
        >
          {result.valid ? (
            <ShieldCheck className="h-6 w-6 text-secondary shrink-0 mt-0.5" />
          ) : (
            <ShieldAlert className="h-6 w-6 text-danger shrink-0 mt-0.5" />
          )}
          <div>
            <p className={`text-[15px] font-semibold ${result.valid ? "text-secondary" : "text-danger"}`}>
              {result.valid ? "Chain valid — zero tampering detected" : "Integrity violation detected"}
            </p>
            <p className="text-[13px] text-text-secondary mt-1">
              {result.totalEntries} total ledger entries examined.
            </p>
            {!result.valid && (
              <p className="text-[13px] text-danger mt-1">
                Break located at index {result.brokenIndex} (ledger ID {result.brokenEntryId}).{" "}
                {result.reason}
              </p>
            )}
          </div>
        </div>
      )}

      {!result && !loading && !error && (
        <p className="text-[13px] text-text-secondary">
          Run a verification to confirm no ledger entry has been altered since it was written.
        </p>
      )}

      {user?.role === "Admin" && (
        <p className="text-[12px] text-text-secondary/80 mt-6 border-t border-border pt-4">
          "Simulate tamper" mutates a single ledger entry to demonstrate detection, then immediately
          re-runs verification so you can see the break. Use only in a demo environment.
        </p>
      )}
    </div>
  );
}
