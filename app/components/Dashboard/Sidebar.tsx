"use client";

import { Button } from "@/app/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Building2,
  Calendar,
  CalendarCheck,
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

interface SidebarProps {
  userRole: "admin" | "user";
  userName?: string;
  userEmail?: string;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const adminNavItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/user/dashboard",
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    label: "Manage Bookings",
    href: "/user/bookings",
    icon: <CalendarCheck className="w-5 h-5" />,
  },
  {
    label: "Manage Spaces",
    href: "/user/spaces",
    icon: <Building2 className="w-5 h-5" />,
  },
  {
    label: "Users",
    href: "/user/users",
    icon: <Users className="w-5 h-5" />,
  },
  {
    label: "Settings",
    href: "/user/settings",
    icon: <Settings className="w-5 h-5" />,
  },
];

const studentNavItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/user/dashboard",
    icon: <Home className="w-5 h-5" />,
  },
  {
    label: "Browse Spaces",
    href: "/user/spaces",
    icon: <Building2 className="w-5 h-5" />,
  },
  {
    label: "My Bookings",
    href: "/user/bookings",
    icon: <Calendar className="w-5 h-5" />,
  },
  {
    label: "Settings",
    href: "/user/settings",
    icon: <Settings className="w-5 h-5" />,
  },
];

export default function Sidebar({
  userRole,
  userName,
  userEmail,
}: SidebarProps) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navItems = userRole === "admin" ? adminNavItems : studentNavItems;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-sky-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg">LCUP Events</h2>
              <p className="text-xs text-gray-500 capitalize">
                {userRole} Panel
              </p>
            </div>
          </div>
          {/* Mobile close button */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* User Info */}
        {userName && (
          <div className="bg-gradient-to-r from-sky-50 to-emerald-50 rounded-lg p-3">
            <p className="font-semibold text-sm truncate">{userName}</p>
            <p className="text-xs text-gray-600 truncate">{userEmail}</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all cursor-pointer",
                isActive
                  ? "bg-gradient-to-r from-sky-500 to-emerald-500 text-white shadow-lg"
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t space-y-2">
        <Link href="/" className="w-full">
          <Button
            variant="outline"
            className="w-full justify-start gap-3 cursor-pointer"
          >
            <Home className="w-5 h-5" />
            <span>Back to Home</span>
          </Button>
        </Link>
        <Link href="/signout" className="w-full">
          <Button
            variant="destructive"
            className="w-full justify-start gap-3 cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </Button>
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-white rounded-lg shadow-lg border-2 cursor-pointer"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        />
      )}

      {/* Mobile Sidebar */}
      <motion.aside
        initial={{ x: -300 }}
        animate={{ x: isMobileOpen ? 0 : -300 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="lg:hidden fixed left-0 top-0 bottom-0 w-72 bg-white border-r shadow-2xl z-50"
      >
        <SidebarContent />
      </motion.aside>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-72 bg-white border-r shadow-lg h-screen sticky top-0">
        <SidebarContent />
      </aside>
    </>
  );
}
