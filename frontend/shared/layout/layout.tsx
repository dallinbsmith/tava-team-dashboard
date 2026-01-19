"use client";

import { useState } from "react";
import { useUser } from "@auth0/nextjs-auth0/client";
import { useCurrentUser } from "@/providers";
import { Sidebar } from "@/shared/common";
import { Menu } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user: auth0User, isLoading: authLoading } = useUser();
  const { currentUser, loading } = useCurrentUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-theme-base flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!auth0User) {
    return null;
  }

  return (
    <div className="min-h-screen bg-theme-base">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-theme-sidebar border-b border-theme-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 text-theme-text-muted hover:text-theme-text hover:bg-theme-sidebar-hover transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6" />
        </button>
      </header>

      <Sidebar
        user={{
          name: auth0User.name || auth0User.email || undefined,
          email: auth0User.email || undefined,
          picture: auth0User.picture || undefined,
          s3AvatarUrl: currentUser?.avatar_url,
        }}
        role={currentUser?.role}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(false)}
      />
      <main className="lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8">
        {loading ? (
          <div className="flex items-center justify-center py-12 h-[calc(100vh-200px)]">
            <div className="animate-spin h-12 w-12 border-b-2 border-primary-500"></div>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
