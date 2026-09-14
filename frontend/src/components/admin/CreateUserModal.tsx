import { useState } from "react";
import type { FormEvent } from "react";
import { KeyRound } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input, Label, Select } from "../ui/Input";
import { ErrorBanner } from "../ui/Feedback";
import { AdminAPI, apiErrorMessage } from "../../lib/api";
import type { Role, User } from "../../types";

const ROLES: Role[] = ["IO", "Prosecutor", "Judge", "Forensic Expert", "Registrar", "Admin"];

export function CreateUserModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (user: User) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("IO");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keypair, setKeypair] = useState<{ publicKey: string; privateKey: string } | null>(null);
  const [createdUser, setCreatedUser] = useState<User | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await AdminAPI.createUser({ name, email, password, role });
      setKeypair(res.keypair);
      setCreatedUser(res.user);
      onCreated(res.user);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (keypair && createdUser) {
    return (
      <Modal title="User created" onClose={onClose}>
        <div className="flex flex-col gap-4">
          <p className="text-[13px] text-text-secondary">
            <span className="font-medium text-text-primary">{createdUser.name}</span> was created as{" "}
            {createdUser.role}. Save the private key now — it will not be shown again.
          </p>
          <div className="rounded-sm border border-warning/30 bg-warning/5 px-3 py-2.5 flex items-start gap-2">
            <KeyRound className="h-4 w-4 text-warning mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-text-secondary uppercase tracking-wide">
                Private key (store securely)
              </p>
              <p className="text-[11px] font-mono-num text-text-primary break-all mt-1">{keypair.privateKey}</p>
            </div>
          </div>
          <div className="rounded-sm border border-border bg-background px-3 py-2.5">
            <p className="text-[11px] font-medium text-text-secondary uppercase tracking-wide">Public key</p>
            <p className="text-[11px] font-mono-num text-text-primary break-all mt-1">{keypair.publicKey}</p>
          </div>
          <Button onClick={onClose} className="self-end">
            Done
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Create user" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <Label htmlFor="name">Full name</Label>
          <Input id="name" required autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="password">Temporary password</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="role">Role</Label>
          <Select id="role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        </div>
        {error && <ErrorBanner message={error} />}
        <div className="flex justify-end gap-2 mt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Create user
          </Button>
        </div>
      </form>
    </Modal>
  );
}
