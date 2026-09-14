import { useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, KeyRound, LogOut, ShieldCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { AuthAPI, CollaborationAPI, apiErrorMessage } from "../../lib/api";
import type { Notification } from "../../types";
import { formatDateTime, initials } from "../../lib/utils";
import { useNavigate } from "react-router-dom";

export function TopBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [mfaSetup, setMfaSetup] = useState<{ mfaSecret: string; currentOtp: string } | null>(null);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    CollaborationAPI.myNotifications()
      .then((res) => {
        if (mounted) setNotifications(res.notifications);
      })
      .catch(() => {});
    const interval = setInterval(() => {
      CollaborationAPI.myNotifications()
        .then((res) => mounted && setNotifications(res.notifications))
        .catch(() => {});
    }, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function enableMfa() {
    setMfaLoading(true);
    setMfaError(null);
    try {
      const res = await AuthAPI.setupMfa();
      setMfaSetup(res);
    } catch (err) {
      setMfaError(apiErrorMessage(err));
    } finally {
      setMfaLoading(false);
    }
  }

  async function markRead(id: string) {
    try {
      await CollaborationAPI.markRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch {
      // non-blocking
    }
  }

  return (
    <header className="h-14 shrink-0 border-b border-border bg-surface flex items-center justify-between px-5">
      <button
        onClick={() => navigate("/")}
        className="flex items-center gap-2 text-primary"
      >
        <ShieldCheck className="h-5 w-5" strokeWidth={2.25} />
        <span className="text-[16px] font-semibold tracking-tight">Secure DMS</span>
      </button>

      <div className="flex items-center gap-2">
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="relative flex h-9 w-9 items-center justify-center rounded-sm text-text-secondary hover:bg-black/5 hover:text-text-primary"
            aria-label="Notifications"
          >
            <Bell className="h-[18px] w-[18px]" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-danger" />
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 mt-2 w-96 rounded-md border border-border bg-surface shadow-[0_4px_12px_rgba(0,0,0,0.08)] z-40">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <span className="text-[13px] font-semibold text-text-primary">Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-[12px] text-text-secondary">{unreadCount} unread</span>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="px-4 py-6 text-center text-[13px] text-text-secondary">
                    No notifications yet.
                  </p>
                ) : (
                  notifications.slice(0, 20).map((n) => (
                    <button
                      key={n.id}
                      onClick={() => markRead(n.id)}
                      className={`block w-full text-left px-4 py-3 border-b border-border last:border-b-0 hover:bg-background transition-colors ${
                        n.read ? "" : "bg-secondary/5"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[13px] font-medium text-text-primary">{n.title}</p>
                        {!n.read && <span className="h-1.5 w-1.5 mt-1.5 rounded-full bg-secondary shrink-0" />}
                      </div>
                      <p className="text-[12px] text-text-secondary mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[11px] text-text-secondary/70 mt-1 font-mono-num">
                        {formatDateTime(n.created_at)}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={userRef}>
          <button
            onClick={() => setUserOpen((v) => !v)}
            className="flex items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-black/5"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white text-[12px] font-semibold">
              {initials(user?.name)}
            </span>
            <span className="hidden sm:flex flex-col items-start leading-tight">
              <span className="text-[13px] font-medium text-text-primary">{user?.name}</span>
              <span className="text-[11px] text-text-secondary">{user?.role}</span>
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-text-secondary" />
          </button>
          {userOpen && (
            <div className="absolute right-0 mt-2 w-72 rounded-md border border-border bg-surface shadow-[0_4px_12px_rgba(0,0,0,0.08)] z-40 py-1">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-[13px] font-medium text-text-primary">{user?.name}</p>
                <p className="text-[12px] text-text-secondary">{user?.email}</p>
              </div>

              <div className="px-3 py-2.5 border-b border-border">
                {!user?.mfa_enabled && !mfaSetup && (
                  <button
                    onClick={enableMfa}
                    disabled={mfaLoading}
                    className="w-full flex items-center gap-2 rounded-sm px-2 py-1.5 text-[13px] text-text-secondary hover:bg-black/5 hover:text-text-primary disabled:opacity-50"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    {mfaLoading ? "Enabling…" : "Enable two-factor authentication"}
                  </button>
                )}
                {user?.mfa_enabled && !mfaSetup && (
                  <p className="flex items-center gap-2 px-2 py-1.5 text-[12px] text-secondary">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Two-factor authentication is on
                  </p>
                )}
                {mfaError && <p className="px-2 text-[12px] text-danger">{mfaError}</p>}
                {mfaSetup && (
                  <div className="px-2 py-1 flex flex-col gap-1.5">
                    <p className="text-[12px] font-medium text-secondary flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Two-factor authentication enabled
                    </p>
                    <p className="text-[11px] text-text-secondary">
                      Store this secret in your authenticator app. Current code (demo):
                    </p>
                    <p className="text-[13px] font-mono-num font-semibold text-text-primary">
                      {mfaSetup.currentOtp}
                    </p>
                    <p className="text-[10px] font-mono-num text-text-secondary break-all">
                      {mfaSetup.mfaSecret}
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-danger hover:bg-danger/5"
              >
                <LogOut className="h-3.5 w-3.5" />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
