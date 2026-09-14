import { NavLink } from "react-router-dom";
import { LayoutGrid, MessagesSquare, ScrollText, Settings } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { cn } from "../../lib/utils";

const navItem =
  "flex items-center gap-2.5 rounded-sm px-3 py-2 text-[13px] font-medium transition-colors";

export function Sidebar() {
  const { user } = useAuth();

  return (
    <nav className="w-[240px] shrink-0 border-r border-border bg-surface flex flex-col py-4 px-3 gap-1">
      <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-text-secondary/70">
        Workspace
      </p>
      <NavLink
        to="/"
        end
        className={({ isActive }) =>
          cn(navItem, isActive ? "bg-primary/10 text-primary" : "text-text-secondary hover:bg-black/5 hover:text-text-primary")
        }
      >
        <LayoutGrid className="h-4 w-4" />
        Cases
      </NavLink>
      <NavLink
        to="/ai"
        className={({ isActive }) =>
          cn(navItem, isActive ? "bg-primary/10 text-primary" : "text-text-secondary hover:bg-black/5 hover:text-text-primary")
        }
      >
        <MessagesSquare className="h-4 w-4" />
        AI Assistant
      </NavLink>
      <NavLink
        to="/ledger"
        className={({ isActive }) =>
          cn(navItem, isActive ? "bg-primary/10 text-primary" : "text-text-secondary hover:bg-black/5 hover:text-text-primary")
        }
      >
        <ScrollText className="h-4 w-4" />
        Ledger Integrity
      </NavLink>

      {user?.role === "Admin" && (
        <>
          <p className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wide text-text-secondary/70">
            Administration
          </p>
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              cn(navItem, isActive ? "bg-primary/10 text-primary" : "text-text-secondary hover:bg-black/5 hover:text-text-primary")
            }
          >
            <Settings className="h-4 w-4" />
            System &amp; Users
          </NavLink>
        </>
      )}

      <div className="mt-auto px-3 pt-4 border-t border-border">
        <p className="text-[11px] text-text-secondary/70 leading-relaxed">
          Every action is written to an append-only, cryptographically chained audit ledger.
        </p>
      </div>
    </nav>
  );
}
