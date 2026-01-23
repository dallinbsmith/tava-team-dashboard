import { memo } from "react";

interface EventTypeFilterButtonProps {
  label: string;
  color: string;
  isActive: boolean;
  onClick: () => void;
  dashed?: boolean;
}

const EventTypeFilterButton = memo(function EventTypeFilterButton({
  label,
  color,
  isActive,
  onClick,
  dashed = false,
}: EventTypeFilterButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
        isActive
          ? `bg-[${color}]/20 border border-[${color}]/50 text-theme-text`
          : "bg-theme-surface border border-theme-border text-theme-text-subtle hover:bg-theme-muted hover:text-theme-text-muted"
      }`}
      style={
        isActive
          ? {
              backgroundColor: `${color}20`,
              borderColor: `${color}80`,
            }
          : undefined
      }
      title={
        isActive ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`
      }
    >
      <span
        className={`w-3 h-3 rounded shadow-sm ${dashed ? "border border-dashed" : ""}`}
        style={{
          backgroundColor: isActive ? color : `${color}66`,
          borderColor: dashed ? (isActive ? color : `${color}66`) : undefined,
        }}
      />
      <span>{label}</span>
    </button>
  );
});

export default EventTypeFilterButton;
