import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, KeyRound, Lock, Mail } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiErrorMessage } from "../lib/api";
import { Button } from "../components/ui/Button";
import { Input, Label } from "../components/ui/Input";
import { ErrorBanner } from "../components/ui/Feedback";

export function LoginPage() {
  const { login, verifyMfa, mfaChallenge, cancelMfa } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await login(email, password);
      if (!res.requiresMfa) navigate("/");
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleMfa(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await verifyMfa(otp);
      navigate("/");
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary text-white mb-3">
            <ShieldCheck className="h-6 w-6" strokeWidth={2.25} />
          </div>
          <h1 className="text-[22px] font-bold text-text-primary tracking-tight">Secure DMS</h1>
          <p className="text-[13px] text-text-secondary mt-1 text-center">
            Case document management for law enforcement, courts &amp; investigative departments
          </p>
        </div>

        <div className="bg-surface border border-border rounded-md px-6 py-6">
          {!mfaChallenge ? (
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <h2 className="text-[16px] font-semibold text-text-primary mb-1">Sign in</h2>
              <div>
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                  <Input
                    id="email"
                    type="email"
                    required
                    autoFocus
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@department.gov.in"
                    className="pl-9"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                  <Input
                    id="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    className="pl-9"
                  />
                </div>
              </div>
              {error && <ErrorBanner message={error} />}
              <Button type="submit" loading={loading} className="w-full mt-1">
                Continue
              </Button>
            </form>
          ) : (
            <form onSubmit={handleMfa} className="flex flex-col gap-4">
              <h2 className="text-[16px] font-semibold text-text-primary mb-1">Two-factor verification</h2>
              <p className="text-[13px] text-text-secondary -mt-2">
                Enter the one-time code sent to your registered device to complete sign-in.
              </p>
              <div>
                <Label htmlFor="otp">Verification code</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                  <Input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    required
                    autoFocus
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="6-digit code"
                    className="pl-9 font-mono-num tracking-widest"
                  />
                </div>
              </div>
              {mfaChallenge.demoOtp && (
                <p className="text-[12px] text-text-secondary bg-background border border-border rounded-sm px-3 py-2">
                  Development mode — demo OTP:{" "}
                  <span className="font-mono-num font-semibold text-text-primary">
                    {mfaChallenge.demoOtp}
                  </span>
                </p>
              )}
              {error && <ErrorBanner message={error} />}
              <Button type="submit" loading={loading} className="w-full mt-1">
                Verify &amp; sign in
              </Button>
              <button
                type="button"
                onClick={() => {
                  cancelMfa();
                  setOtp("");
                  setError(null);
                }}
                className="text-[13px] text-text-secondary hover:text-text-primary self-center"
              >
                Back to sign in
              </button>
            </form>
          )}
        </div>

        <p className="text-[12px] text-text-secondary text-center mt-6">
          Access is logged, MFA-enforced, and restricted to authorized personnel only.
        </p>
      </div>
    </div>
  );
}
