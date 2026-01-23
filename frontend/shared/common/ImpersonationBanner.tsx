"use client";

import { useImpersonation } from "@/providers/ImpersonationProvider";
import { Eye, X } from "lucide-react";

export default function ImpersonationBanner() {
  const { isImpersonating, impersonatedUser, endImpersonation } =
    useImpersonation();

  if (!isImpersonating || !impersonatedUser) {
    return null;
  }

  const userName = `${impersonatedUser.first_name} ${impersonatedUser.last_name}`;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-amber-950">
      <div className="max-w-7xl mx-auto px-4 py-1 flex items-center justify-center gap-3">
        <div className="flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">
            Impersonating <strong>{userName}</strong>
          </span>
        </div>
        <button
          onClick={endImpersonation}
          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-amber-950 text-amber-100 hover:bg-amber-900 transition-colors rounded-full"
        >
          <X className="w-3 h-3" />
          End Impersonation
        </button>
      </div>
    </div>
  );
}
