import { memo } from "react";
import Link from "next/link";
import { User } from "@/shared/types/user";
import Avatar from "@/shared/common/Avatar";
import { Mail, Building2, Calendar, ChevronRight, Shield } from "lucide-react";
import { badge, iconContainerHover, cardInteractive } from "@/lib/styles";
import { cn } from "@/lib/utils";

interface EmployeeCardProps {
  employee: User;
}

const EmployeeCard = memo(function EmployeeCard({
  employee,
}: EmployeeCardProps) {
  const formattedDate = employee.date_started
    ? new Date(employee.date_started).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "N/A";

  return (
    <Link
      href={`/employee/${employee.id}`}
      className={cn(
        cardInteractive,
        "block p-4 sm:p-6 group relative overflow-hidden rounded-lg",
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary-900/0 to-primary-800/0 group-hover:from-primary-900/20 group-hover:to-primary-800/10 transition-all duration-300" />

      <div className="relative">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
            <Avatar
              s3AvatarUrl={employee.avatar_url}
              firstName={employee.first_name}
              lastName={employee.last_name}
              size="lg"
              className="ring-2 ring-theme-border group-hover:ring-primary-500/50 transition-all duration-300 shadow-lg shadow-primary-900/30 flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-theme-text group-hover:text-primary-400 transition-colors flex items-center gap-2 text-sm sm:text-base">
                <span className="truncate">
                  {employee.first_name} {employee.last_name}
                </span>
                {employee.role === "admin" && (
                  <Shield
                    className="w-4 h-4 text-amber-400"
                    aria-label="Admin"
                  />
                )}
                {employee.role === "supervisor" && (
                  <Shield
                    className="w-4 h-4 text-purple-400"
                    aria-label="Supervisor"
                  />
                )}
              </h3>
              <div className="text-sm text-theme-text-muted mt-1">
                {employee.title}
              </div>
              {(employee.squads?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {(employee.squads ?? []).map((squad) => (
                    <span key={squad.id} className={badge}>
                      {squad.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="p-2 bg-theme-elevated group-hover:bg-primary-900/30 transition-all duration-300">
            <ChevronRight className="w-5 h-5 text-theme-text-muted group-hover:text-primary-400 group-hover:translate-x-0.5 transition-all duration-300" />
          </div>
        </div>

        <div className="mt-4 sm:mt-5 space-y-2 sm:space-y-2.5 pt-3 sm:pt-4 border-t border-theme-border group-hover:border-primary-500/30 transition-colors duration-300">
          <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-theme-text-muted group-hover:text-theme-text transition-colors">
            <div className={iconContainerHover}>
              <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-theme-text-muted group-hover:text-primary-400 transition-colors" />
            </div>
            <span className="truncate">{employee.email}</span>
          </div>
          {employee.department && (
            <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-theme-text-muted group-hover:text-theme-text transition-colors">
              <div className={iconContainerHover}>
                <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-theme-text-muted group-hover:text-primary-400 transition-colors" />
              </div>
              <span className="truncate">{employee.department}</span>
            </div>
          )}
          <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-theme-text-muted group-hover:text-theme-text transition-colors">
            <div className={iconContainerHover}>
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-theme-text-muted group-hover:text-primary-400 transition-colors" />
            </div>
            <span>Started {formattedDate}</span>
          </div>
        </div>
      </div>
    </Link>
  );
});

export default EmployeeCard;
