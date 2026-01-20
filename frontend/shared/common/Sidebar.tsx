"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Avatar from "./Avatar";
import { LayoutDashboard, LogOut, Mail, Settings, GitBranch, Calendar, Palmtree, Menu, X, Users } from "lucide-react";

interface SidebarProps {
  user: {
    firstName?: string;
    lastName?: string;
    email?: string;
    s3AvatarUrl?: string;
  };
  role?: string;
  isOpen?: boolean;
  onToggle?: () => void;
}

export default function Sidebar({ user, role, isOpen = false, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full w-64 bg-theme-sidebar border-r border-theme-border flex flex-col z-50 transition-transform duration-300 ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
      >
        {/* Logo/Brand */}
        <div className="px-3 py-3 border-b border-theme-border flex items-center justify-between">
          <div className="ml-2">
            <Link href="/" onClick={onToggle} className="flex items-center gap-1">
              <img
                src="https://tava-team-calendar.s3.us-east-2.amazonaws.com/avatars/tava-logo.svg"
                alt="Tava"
                className="w-20 h-12"
              />
            </Link>
          </div>
          {/* Mobile close button */}
          <button
            onClick={onToggle}
            className="lg:hidden p-1 text-theme-text-muted hover:text-theme-text transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6">
          <ul className="space-y-2">
            <li>
              <Link
                href="/"
                onClick={onToggle}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${pathname === "/"
                  ? "bg-theme-sidebar-active text-primary-400 border-l-2 border-primary-500"
                  : "text-theme-text-muted hover:bg-theme-sidebar-hover hover:text-theme-text"
                  }`}
              >
                <LayoutDashboard className="w-5 h-5" />
                {role === "admin" ? "Overview" : role === "supervisor" || role === "admin" ? "My Team" : "My Profile"}
              </Link>
            </li>

            <li>
              <Link
                href="/calendar"
                onClick={onToggle}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${pathname === "/calendar"
                  ? "bg-theme-sidebar-active text-primary-400 border-l-2 border-primary-500"
                  : "text-theme-text-muted hover:bg-theme-sidebar-hover hover:text-theme-text"
                  }`}
              >
                <Calendar className="w-5 h-5" />
                Calendar
              </Link>
            </li>

            <li>
              <Link
                href="/time-off"
                onClick={onToggle}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${pathname === "/time-off"
                  ? "bg-theme-sidebar-active text-primary-400 border-l-2 border-primary-500"
                  : "text-theme-text-muted hover:bg-theme-sidebar-hover hover:text-theme-text"
                  }`}
              >
                <Palmtree className="w-5 h-5" />
                Time Off
              </Link>
            </li>

            {role === "admin" && (
              <li>
                <Link
                  href="/admin/invitations"
                  onClick={onToggle}
                  className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${pathname === "/admin/invitations"
                    ? "bg-theme-sidebar-active text-primary-400 border-l-2 border-primary-500"
                    : "text-theme-text-muted hover:bg-theme-sidebar-hover hover:text-theme-text"
                    }`}
                >
                  <Mail className="w-5 h-5" />
                  Invitations
                </Link>
              </li>
            )}

            <li>
              <Link
                href="/orgchart"
                onClick={onToggle}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${pathname === "/orgchart"
                  ? "bg-theme-sidebar-active text-primary-400 border-l-2 border-primary-500"
                  : "text-theme-text-muted hover:bg-theme-sidebar-hover hover:text-theme-text"
                  }`}
              >
                <GitBranch className="w-5 h-5" />
                Org Chart
              </Link>
            </li>

            {(role === "supervisor" || role === "admin") && (
              <li>
                <Link
                  href="/teams"
                  onClick={onToggle}
                  className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${pathname === "/teams"
                    ? "bg-theme-sidebar-active text-primary-400 border-l-2 border-primary-500"
                    : "text-theme-text-muted hover:bg-theme-sidebar-hover hover:text-theme-text"
                    }`}
                >
                  <Users className="w-5 h-5" />
                  Teams
                </Link>
              </li>
            )}

            {(role === "supervisor" || role === "admin") && (
              <li>
                <Link
                  href="/settings"
                  onClick={onToggle}
                  className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${pathname === "/settings"
                    ? "bg-theme-sidebar-active text-primary-400 border-l-2 border-primary-500"
                    : "text-theme-text-muted hover:bg-theme-sidebar-hover hover:text-theme-text"
                    }`}
                >
                  <Settings className="w-5 h-5" />
                  Settings
                </Link>
              </li>
            )}
          </ul>
        </nav>

        {/* User Profile & Logout */}
        <div className="px-4 py-4 border-t border-theme-border">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <Avatar
              s3AvatarUrl={user.s3AvatarUrl}
              firstName={user.firstName || "U"}
              lastName={user.lastName || "ser"}
              size="md"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-theme-text truncate">
                {user.firstName && user.lastName
                  ? `${user.firstName} ${user.lastName}`
                  : user.email}
              </p>
              <p className="text-xs text-theme-text-muted capitalize">{role}</p>
            </div>
          </div>

          <a
            href="/auth/logout"
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-theme-text-muted hover:bg-theme-sidebar-hover hover:text-theme-text transition-colors w-full"
          >
            <LogOut className="w-5 h-5" />
            Sign out
          </a>
        </div>
      </aside>
    </>
  );
}
