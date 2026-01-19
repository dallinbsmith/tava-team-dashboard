"use client";

import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface GroupedSectionProps {
  title: string;
  count: number;
  icon?: LucideIcon;
  iconColor?: string;
  indicator?: ReactNode;
  children: ReactNode;
}

export default function GroupedSection({
  title,
  count,
  icon: Icon,
  iconColor = "text-theme-text-muted",
  indicator,
  children,
}: GroupedSectionProps) {
  return (
    <div>
      <div className="px-6 py-3 bg-theme-elevated flex items-center gap-2">
        {indicator}
        {Icon && <Icon className={`w-4 h-4 ${iconColor}`} />}
        <h3 className="font-semibold text-theme-text">{title}</h3>
        <span className="px-2 py-0.5 text-xs font-medium bg-theme-surface text-theme-text-muted rounded-full">
          {count}
        </span>
      </div>
      <div className="divide-y divide-theme-border/50">
        {children}
      </div>
    </div>
  );
}
