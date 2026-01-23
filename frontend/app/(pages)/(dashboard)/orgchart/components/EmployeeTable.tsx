"use client";

import { User } from "@/shared/types/user";
import Avatar from "@/shared/common/Avatar";
import { SortField, SortOrder } from "@/hooks/useEmployeeList";
import { ChevronUp, ChevronDown, Shield } from "lucide-react";
import { getDepartmentBgColor } from "@/lib/department-colors";

interface EmployeeTableProps {
  employees: User[];
  onRowClick?: (employee: User) => void;
  sortField: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
}

export default function EmployeeTable({
  employees,
  onRowClick,
  sortField,
  sortOrder,
  onSort,
}: EmployeeTableProps) {
  const handleRowClick = (employee: User) => {
    if (onRowClick) {
      onRowClick(employee);
    } else {
      window.location.href = `/employee/${employee.id}`;
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortOrder === "asc" ? (
      <ChevronUp className="w-3.5 h-3.5 ml-1 text-primary-400" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 ml-1 text-primary-400" />
    );
  };

  return (
    <div className="bg-theme-surface border border-theme-border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-theme-elevated border-b border-theme-border">
          <tr>
            <th
              className="text-left px-4 py-3 text-xs font-semibold text-theme-text-muted uppercase tracking-wider cursor-pointer hover:bg-theme-surface/50 transition-colors"
              onClick={() => onSort("name")}
            >
              <div className="flex items-center">
                Employee
                <SortIcon field="name" />
              </div>
            </th>
            <th
              className="text-left px-4 py-3 text-xs font-semibold text-theme-text-muted uppercase tracking-wider hidden md:table-cell cursor-pointer hover:bg-theme-surface/50 transition-colors"
              onClick={() => onSort("email")}
            >
              <div className="flex items-center">
                Email
                <SortIcon field="email" />
              </div>
            </th>
            <th
              className="text-left px-4 py-3 text-xs font-semibold text-theme-text-muted uppercase tracking-wider hidden lg:table-cell cursor-pointer hover:bg-theme-surface/50 transition-colors"
              onClick={() => onSort("department")}
            >
              <div className="flex items-center">
                Department
                <SortIcon field="department" />
              </div>
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-theme-text-muted uppercase tracking-wider hidden xl:table-cell">
              Squad
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-theme-text-muted uppercase tracking-wider hidden sm:table-cell">
              Role
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-theme-border text-sm">
          {employees.map((employee) => (
            <tr
              key={employee.id}
              className="hover:bg-theme-elevated/50 transition-colors cursor-pointer group"
              onClick={() => handleRowClick(employee)}
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-1 h-10 rounded-full ${employee.department ? getDepartmentBgColor(employee.department) : "bg-theme-border"}`}
                  />
                  <Avatar
                    s3AvatarUrl={employee.avatar_url}
                    firstName={employee.first_name}
                    lastName={employee.last_name}
                    size="sm"
                    className="ring-2 ring-theme-border group-hover:ring-primary-500/50 transition-all"
                  />
                  <div>
                    <div className="font-medium text-theme-text group-hover:text-primary-400 transition-colors flex items-center gap-1.5">
                      {employee.first_name} {employee.last_name}
                      {employee.role === "admin" && (
                        <Shield className="w-3.5 h-3.5 text-amber-400" />
                      )}
                      {employee.role === "supervisor" && (
                        <Shield className="w-3.5 h-3.5 text-purple-400" />
                      )}
                    </div>
                    <div className="text-xs text-theme-text-muted md:hidden">{employee.email}</div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-theme-text-muted hidden md:table-cell">
                {employee.email}
              </td>
              <td className="px-4 py-3 text-theme-text-muted hidden lg:table-cell">
                {employee.department || "-"}
              </td>
              <td className="px-4 py-3 text-theme-text-muted hidden xl:table-cell">
                {(employee.squads?.length ?? 0) > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {(employee.squads ?? []).slice(0, 2).map((s) => (
                      <span
                        key={s.id}
                        className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-theme-elevated text-theme-text-muted border border-theme-border rounded"
                      >
                        {s.name}
                      </span>
                    ))}
                    {(employee.squads?.length ?? 0) > 2 && (
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium text-theme-text-muted">
                        +{(employee.squads?.length ?? 0) - 2}
                      </span>
                    )}
                  </div>
                ) : (
                  "-"
                )}
              </td>
              <td className="px-4 py-3 hidden sm:table-cell">
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                    employee.role === "supervisor"
                      ? "bg-purple-900/30 text-purple-300 border border-purple-500/30"
                      : employee.role === "admin"
                        ? "bg-amber-900/30 text-amber-300 border border-amber-500/30"
                        : "bg-primary-900/30 text-primary-300 border border-primary-500/30"
                  }`}
                >
                  {employee.title || employee.role.charAt(0).toUpperCase() + employee.role.slice(1)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
