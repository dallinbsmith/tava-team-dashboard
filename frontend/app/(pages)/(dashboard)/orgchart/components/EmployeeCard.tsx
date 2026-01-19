import Link from "next/link";
import { User } from "@/shared/types/user";
import Avatar from "@/shared/common/Avatar";
import { Mail, Building2, Calendar, ChevronRight, Shield } from "lucide-react";

interface EmployeeCardProps {
  employee: User;
}

export default function EmployeeCard({ employee }: EmployeeCardProps) {

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
      className="block bg-theme-surface border border-theme-border hover:border-primary-500/50 hover:shadow-lg transition-all duration-300 p-6 group hover:scale-[1.02] relative overflow-hidden"
    >
      {/* Gradient highlight on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-900/0 to-primary-800/0 group-hover:from-primary-900/20 group-hover:to-primary-800/10 transition-all duration-300" />

      <div className="relative">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar
              s3AvatarUrl={employee.avatar_url}
              firstName={employee.first_name}
              lastName={employee.last_name}
              size="lg"
              className="ring-2 ring-theme-border group-hover:ring-primary-500/50 transition-all duration-300 shadow-lg shadow-primary-900/30"
            />
            <div>
              <h3 className="font-semibold text-theme-text group-hover:text-primary-400 transition-colors flex items-center gap-2">
                {employee.first_name} {employee.last_name}
                {employee.role === "supervisor" && (
                  <Shield className="w-4 h-4 text-purple-400" aria-label="Supervisor" />
                )}
              </h3>
              <div className="text-sm text-theme-text-muted mt-1">
                {employee.title}
              </div>
              {employee.squads?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {employee.squads.map(squad => (
                    <span
                      key={squad.id}
                      className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-theme-elevated text-theme-text-muted border border-theme-border"
                    >
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

        <div className="mt-5 space-y-2.5 pt-4 border-t border-theme-border group-hover:border-primary-500/30 transition-colors duration-300">
          <div className="flex items-center gap-3 text-sm text-theme-text-muted group-hover:text-theme-text transition-colors">
            <div className="w-8 h-8 bg-theme-elevated group-hover:bg-primary-900/30 flex items-center justify-center transition-colors">
              <Mail className="w-4 h-4 text-theme-text-muted group-hover:text-primary-400 transition-colors" />
            </div>
            <span className="truncate">{employee.email}</span>
          </div>
          {employee.department && (
            <div className="flex items-center gap-3 text-sm text-theme-text-muted group-hover:text-theme-text transition-colors">
              <div className="w-8 h-8 bg-theme-elevated group-hover:bg-primary-900/30 flex items-center justify-center transition-colors">
                <Building2 className="w-4 h-4 text-theme-text-muted group-hover:text-primary-400 transition-colors" />
              </div>
              <span>{employee.department}</span>
            </div>
          )}
          <div className="flex items-center gap-3 text-sm text-theme-text-muted group-hover:text-theme-text transition-colors">
            <div className="w-8 h-8 bg-theme-elevated group-hover:bg-primary-900/30 flex items-center justify-center transition-colors">
              <Calendar className="w-4 h-4 text-theme-text-muted group-hover:text-primary-400 transition-colors" />
            </div>
            <span>Started {formattedDate}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
