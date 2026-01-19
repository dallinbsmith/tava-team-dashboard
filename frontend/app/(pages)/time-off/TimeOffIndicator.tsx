"use client";

import { TimeOffImpact } from "@/shared/types";
import { Palmtree } from "lucide-react";

interface TimeOffIndicatorProps {
  impact: TimeOffImpact;
  compact?: boolean;
}

export default function TimeOffIndicator({ impact, compact = false }: TimeOffIndicatorProps) {
  if (!impact.has_time_off) {
    return null;
  }

  const percentage = Math.round(impact.impact_percent * 100);

  if (compact) {
    return (
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-amber-900/40 text-amber-300 rounded"
        title={`${impact.time_off_days} of ${impact.remaining_days} remaining business days overlap with time off (${percentage}%)`}
      >
        <Palmtree className="w-3 h-3" />
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-amber-900/40 text-amber-300 rounded"
      title={`${impact.time_off_days} of ${impact.remaining_days} remaining business days overlap with time off`}
    >
      <Palmtree className="w-3 h-3" />
      Time Off Requested
    </span>
  );
}
