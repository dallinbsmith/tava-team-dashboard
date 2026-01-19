"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User } from "@/shared/types";
import { EmployeeHeader, EditEmployeeModal } from "@/app/(pages)/org-chart/employees";
import {
  ArrowLeft,
  Mail,
  Building2,
  Calendar,
  Shield,
  Users,
} from "lucide-react";
import { getDepartmentTextColor } from "@/lib/department-colors";

interface EmployeePageClientProps {
  employee: User;
  currentUser: User;
}

export function EmployeePageClient({ employee: initialEmployee, currentUser }: EmployeePageClientProps) {
  const router = useRouter();
  const [employee, setEmployee] = useState(initialEmployee);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const formattedDate = employee?.date_started
    ? new Date(employee.date_started).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    })
    : "Not specified";

  const canEdit =
    currentUser?.id === employee.id ||
    currentUser?.role === "admin" ||
    (currentUser?.role === "supervisor" &&
      employee.supervisor_id === currentUser?.id);

  return (
    <div className="max-w-4xl">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-theme-text-muted hover:text-theme-text mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      <div className="bg-theme-surface border border-theme-border overflow-hidden">
        <EmployeeHeader
          employee={employee}
          canEdit={canEdit}
          onEditClick={() => setIsEditModalOpen(true)}
        />

        <div className="p-8">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-6">
              <div>
                <h2 className="text-sm font-medium text-theme-text-muted uppercase tracking-wide mb-3">
                  Contact Information
                </h2>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-theme-elevated flex items-center justify-center">
                      <Mail className="w-5 h-5 text-theme-text-muted" />
                    </div>
                    <div>
                      <p className="text-sm text-theme-text-muted">Email</p>
                      <p className="font-medium text-theme-text">
                        {employee.email}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-sm font-medium text-theme-text-muted uppercase tracking-wide mb-3">
                  Work Information
                </h2>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-theme-elevated flex items-center justify-center">
                      <Building2 className={`w-5 h-5 ${employee.department ? getDepartmentTextColor(employee.department) : 'text-theme-text-muted'}`} />
                    </div>
                    <div>
                      <p className="text-sm text-theme-text-muted">Department</p>
                      <p className={`font-medium ${employee.department ? getDepartmentTextColor(employee.department) : 'text-theme-text'}`}>
                        {employee.department || "Not assigned"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-theme-elevated flex items-center justify-center">
                      <Users className="w-5 h-5 text-theme-text-muted" />
                    </div>
                    <div>
                      <p className="text-sm text-theme-text-muted">Squads</p>
                      {employee.squads?.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {employee.squads.map(squad => (
                            <span
                              key={squad.id}
                              className="inline-flex items-center px-2 py-0.5 text-sm font-medium bg-theme-elevated text-theme-text border border-theme-border"
                            >
                              {squad.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="font-medium text-theme-text">Not assigned</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-theme-elevated flex items-center justify-center">
                      <Shield className="w-5 h-5 text-theme-text-muted" />
                    </div>
                    <div>
                      <p className="text-sm text-theme-text-muted">Title</p>
                      <p className="font-medium text-theme-text">
                        {employee.title || employee.role.charAt(0).toUpperCase() + employee.role.slice(1)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h2 className="text-sm font-medium text-theme-text-muted uppercase tracking-wide mb-3">
                  Employment Details
                </h2>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-theme-elevated flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-theme-text-muted" />
                    </div>
                    <div>
                      <p className="text-sm text-theme-text-muted">Start Date</p>
                      <p className="font-medium text-theme-text">
                        {formattedDate}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-sm font-medium text-theme-text-muted uppercase tracking-wide mb-3">
                  Account Information
                </h2>
                <div className="bg-theme-elevated p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-theme-text-muted">User ID</span>
                    <span className="text-sm font-mono text-theme-text">
                      {employee.id}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-theme-text-muted">Created</span>
                    <span className="text-sm text-theme-text">
                      {new Date(employee.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-theme-text-muted">
                      Last Updated
                    </span>
                    <span className="text-sm text-theme-text">
                      {new Date(employee.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <EditEmployeeModal
        employee={employee}
        currentUser={currentUser}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={(updatedEmployee) => {
          setEmployee(updatedEmployee);
          router.refresh();
        }}
      />
    </div>
  );
}
