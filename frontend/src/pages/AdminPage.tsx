import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Activity, Database, HardDrive, UserPlus } from "lucide-react";
import { AdminAPI, apiErrorMessage } from "../lib/api";
import type { Role, SystemHealth, User } from "../types";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Select } from "../components/ui/Input";
import { PageSpinner, ErrorBanner } from "../components/ui/Feedback";
import { CreateUserModal } from "../components/admin/CreateUserModal";
import { initials } from "../lib/utils";

const ROLES: Role[] = ["IO", "Prosecutor", "Judge", "Forensic Expert", "Registrar", "Admin"];

export function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [savingRoleFor, setSavingRoleFor] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  function load() {
    setLoading(true);
    setError(null);
    Promise.all([AdminAPI.listUsers(), AdminAPI.systemHealth()])
      .then(([u, h]) => {
        setUsers(u.users);
        setHealth(h);
      })
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }

  async function changeRole(userId: string, role: Role) {
    setSavingRoleFor(userId);
    try {
      const res = await AdminAPI.updateRole(userId, role);
      setUsers((prev) => prev.map((u) => (u.id === userId ? res.user : u)));
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSavingRoleFor(null);
    }
  }

  if (loading) return <PageSpinner label="Loading admin console…" />;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <h1 className="text-[28px] font-bold text-text-primary leading-tight">System &amp; users</h1>
      <p className="text-[14px] text-text-secondary mt-1 mb-6">
        Manage personnel access and monitor the health of the ledger, storage, and AI services.
      </p>

      {error && <ErrorBanner message={error} />}

      {health && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <HealthCard
            icon={<Database className="h-4 w-4" />}
            label="Database"
            value={health.database.status}
            detail={`${health.database.latencyMs}ms latency`}
            healthy={health.database.status?.toLowerCase() === "healthy" || health.database.status?.toLowerCase() === "ok"}
          />
          <HealthCard
            icon={<Activity className="h-4 w-4" />}
            label="Ledger chain"
            value={health.ledger.chainStatus}
            detail={`${health.ledger.totalEntries} entries`}
            healthy={!health.ledger.tamperDetected}
          />
          <HealthCard
            icon={<HardDrive className="h-4 w-4" />}
            label="Storage"
            value={health.storage.healthy ? "Healthy" : "Degraded"}
            detail={health.storage.type}
            healthy={health.storage.healthy}
          />
        </div>
      )}

      {health && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard label="Cases" value={health.statistics.totalCases} />
          <StatCard label="Documents" value={health.statistics.totalDocuments} />
          <StatCard label="Ledger entries" value={health.statistics.totalLedgerEntries} />
          <StatCard label="Users" value={health.statistics.totalUsers} />
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[16px] font-semibold text-text-primary">Users</h2>
        <Button size="sm" icon={<UserPlus className="h-3.5 w-3.5" />} onClick={() => setShowCreate(true)}>
          Create user
        </Button>
      </div>

      <div className="rounded-md border border-border overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-background text-left text-text-secondary text-[12px]">
              <th className="px-4 py-2.5 font-medium">User</th>
              <th className="px-4 py-2.5 font-medium">Email</th>
              <th className="px-4 py-2.5 font-medium">Role</th>
              <th className="px-4 py-2.5 font-medium">MFA</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-semibold">
                      {initials(u.name)}
                    </span>
                    <span className="font-medium text-text-primary">{u.name}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-text-secondary">{u.email}</td>
                <td className="px-4 py-2.5">
                  <Select
                    value={u.role}
                    disabled={savingRoleFor === u.id}
                    onChange={(e) => changeRole(u.id, e.target.value as Role)}
                    className="w-auto text-[12px] py-1"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </Select>
                </td>
                <td className="px-4 py-2.5">
                  <Badge tone={u.mfa_enabled ? "success" : "neutral"}>
                    {u.mfa_enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <CreateUserModal onClose={() => setShowCreate(false)} onCreated={(u) => setUsers((prev) => [u, ...prev])} />
      )}
    </div>
  );
}

function HealthCard({
  icon,
  label,
  value,
  detail,
  healthy,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
  healthy: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-surface px-4 py-3.5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="flex items-center gap-1.5 text-[12px] font-medium text-text-secondary">
          {icon}
          {label}
        </span>
        <span className={`h-2 w-2 rounded-full ${healthy ? "bg-secondary" : "bg-danger"}`} />
      </div>
      <p className="text-[15px] font-semibold text-text-primary capitalize">{value}</p>
      <p className="text-[12px] text-text-secondary mt-0.5">{detail}</p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-surface px-4 py-3.5">
      <p className="text-[22px] font-bold text-text-primary font-mono-num">{value}</p>
      <p className="text-[12px] text-text-secondary mt-0.5">{label}</p>
    </div>
  );
}
