"use client";

import { Check } from "lucide-react";

export interface FilterCheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export default function FilterCheckbox({
  label,
  checked,
  onChange,
}: FilterCheckboxProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 py-1.5 px-1 cursor-pointer hover:bg-theme-elevated rounded transition-colors w-full text-left"
    >
      <div
        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
          checked
            ? "bg-accent-500 border-accent-500"
            : "border-theme-border bg-transparent"
        }`}
      >
        {checked && <Check className="w-3 h-3 text-white" />}
      </div>
      <span className="text-sm text-theme-text-muted">{label}</span>
    </button>
  );
}
