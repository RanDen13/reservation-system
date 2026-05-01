"use client";

import { Button } from "@/app/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { cn } from "@/lib/utils";
import {
  Building2,
  History,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type AppRole = "OFFICER" | "APPROVER" | "ADMIN" | "SUPER_ADMIN";

interface SidebarProps {
  userRole: AppRole;
  userName?: string;
  userEmail?: string;
}

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles?: AppRole[];
};

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/user/dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    label: "Accounts",
    href: "/user/accounts",
    icon: <Users className="h-5 w-5" />,
    roles: ["SUPER_ADMIN"],
  },
  {
    label: "Bookings",
    href: "/user/bookings",
    icon: <History className="h-5 w-5" />,
    roles: ["OFFICER", "APPROVER", "ADMIN", "SUPER_ADMIN"],
  },
  {
    label: "Venues",
    href: "/user/spaces",
    icon: <Building2 className="h-5 w-5" />,
  },
];

export default function Sidebar({
  userRole,
  userName,
  userEmail,
}: SidebarProps) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="border-b border-sidebar-border p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">
                LCUP Venue Reservation
              </h2>
              <p className="text-xs capitalize text-muted-foreground">
                {userRole.replaceAll("_", " ").toLowerCase()}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="text-muted-foreground hover:text-foreground lg:hidden"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {userName && (
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="truncate text-sm font-semibold">{userName}</p>
            <p className="truncate text-xs text-muted-foreground">
              {userEmail}
            </p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto p-4">
        {navItems
          .filter((item) => !item.roles || item.roles.includes(userRole))
          .map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-4 py-3 transition-colors",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
      </nav>

      <div className="space-y-2 border-t border-sidebar-border p-4">
        <Link href="/">
          <Button variant="outline" className="w-full justify-start gap-3">
            <Home className="h-5 w-5" />
            Home
          </Button>
        </Link>
        {userRole === "SUPER_ADMIN" && (
          <Link href="/user/settings">
            <Button variant="outline" className="w-full justify-start gap-3">
              <Settings className="h-5 w-5" />
              Settings
            </Button>
          </Link>
        )}
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <span className="font-medium">Theme</span>
          <ModeToggle />
        </div>
        <Link href="/signout">
          <Button variant="destructive" className="w-full justify-start gap-3">
            <LogOut className="h-5 w-5" />
            Sign Out
          </Button>
        </Link>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setIsMobileOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-lg border border-border bg-background p-2 shadow-lg lg:hidden"
      >
        <Menu className="h-6 w-6" />
      </button>

      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}

      <aside
        className={cn(
          "fixed bottom-0 left-0 top-0 z-50 w-72 border-r border-sidebar-border bg-sidebar shadow-xl transition-transform lg:hidden",
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <SidebarContent />
      </aside>

      <aside className="sticky top-0 hidden h-screen w-72 flex-col border-r border-sidebar-border bg-sidebar shadow-sm lg:flex">
        <SidebarContent />
      </aside>
    </>
  );
}
