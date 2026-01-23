"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User } from "@/shared/types/user";
import { useImpersonation } from "@/providers/ImpersonationProvider";
import EmployeeHeader from "../../orgchart/components/EmployeeHeader";
import EditEmployeeModal from "../../orgchart/components/EditEmployeeModal";
import { deactivateUser } from "@/lib/api";
import { BaseModal } from "@/components";
import {
  ArrowLeft,
  Mail,
  Building2,
  Calendar,
  Shield,
  Users,
  Eye,
  UserX,
  AlertTriangle,
  Loader2,
} from "lucide-react";

interface EmployeePageClientProps {
  employee: User;
  currentUser: User;
}

export const EmployeePageClient = ({
  employee: initialEmployee,
  currentUser,
}: EmployeePageClientProps) => {
  const router = useRouter();
  const [employee, setEmployee] = useState(initialEmployee);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const { startImpersonation, isImpersonating } = useImpersonation();

  // Admin can impersonate any active user except themselves
  const canImpersonate =
    currentUser?.role === "admin" &&
    currentUser?.id !== employee.id &&
    !isImpersonating &&
    employee.is_active;

  // Admin can remove any active user except themselves
  // Supervisor can remove their active direct reports
  const canRemove =
    employee.is_active &&
    currentUser?.id !== employee.id &&
    (currentUser?.role === "admin" ||
      (currentUser?.role === "supervisor" && employee.supervisor_id === currentUser?.id));

  const handleImpersonate = () => {
    startImpersonation(employee);
    router.push("/");
  };

  const handleRemoveUser = async () => {
    setIsRemoving(true);
    setRemoveError(null);
    try {
      await deactivateUser(employee.id);
      setIsRemoveModalOpen(false);
      router.push("/");
    } catch (err) {
      setRemoveError(err instanceof Error ? err.message : "Failed to remove user");
    } finally {
      setIsRemoving(false);
    }
  };

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
    (currentUser?.role === "supervisor" && employee.supervisor_id === currentUser?.id);

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-theme-text-muted hover:text-theme-text transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <div className="flex items-center gap-2">
          {canImpersonate && (
            <button
              onClick={handleImpersonate}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-amber-600 text-white hover:bg-amber-700 transition-colors"
            >
              <Eye className="w-4 h-4" />
              Impersonate User
            </button>
          )}
          {canRemove && (
            <button
              onClick={() => setIsRemoveModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
            >
              <UserX className="w-4 h-4" />
              Remove User
            </button>
          )}
        </div>
      </div>

      {!employee.is_active && (
        <div className="mb-4 px-4 py-3 bg-red-900/30 border border-red-500/30 flex items-center gap-3">
          <UserX className="w-5 h-5 text-red-400" />
          <span className="text-red-300 font-medium">This user has been deactivated</span>
        </div>
      )}

      <div className="bg-theme-surface border border-theme-border overflow-hidden">
        <EmployeeHeader
          employee={employee}
          canEdit={canEdit && employee.is_active}
          onEditClick={() => setIsEditModalOpen(true)}
          onAvatarUpdate={(newAvatarUrl) => {
            setEmployee((prev) => ({ ...prev, avatar_url: newAvatarUrl }));
          }}
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
                      <p className="font-medium text-theme-text">{employee.email}</p>
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
                      <Building2 className={`w-5 h-5 font-medium text-theme-text`} />
                    </div>
                    <div>
                      <p className="text-sm text-theme-text-muted">Department</p>
                      <p className={`font-medium font-medium text-theme-text`}>
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
                          {employee.squads.map((squad) => (
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
                        {employee.title ||
                          employee.role.charAt(0).toUpperCase() + employee.role.slice(1)}
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
                      <p className="font-medium text-theme-text">{formattedDate}</p>
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
                    <span className="text-sm font-mono text-theme-text">{employee.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-theme-text-muted">Created</span>
                    <span className="text-sm text-theme-text">
                      {new Date(employee.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-theme-text-muted">Last Updated</span>
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

      <BaseModal
        isOpen={isRemoveModalOpen}
        onClose={() => !isRemoving && setIsRemoveModalOpen(false)}
        title="Remove User"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-300">
              <p className="font-medium mb-1">This action cannot be undone.</p>
              <p>Removing this user will:</p>
              <ul className="list-disc ml-4 mt-1 space-y-1">
                <li>Delete all tasks they created</li>
                <li>Delete all their time-off requests</li>
                <li>Unassign tasks that were assigned to them</li>
                <li>Remove them from any supervisor relationships</li>
              </ul>
            </div>
          </div>

          <p className="text-theme-text">
            Are you sure you want to remove{" "}
            <strong>
              {employee.first_name} {employee.last_name}
            </strong>
            ?
          </p>

          {removeError && <p className="text-sm text-red-400">{removeError}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setIsRemoveModalOpen(false)}
              disabled={isRemoving}
              className="px-4 py-2 text-sm font-medium text-theme-text bg-theme-elevated border border-theme-border hover:bg-theme-surface transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleRemoveUser}
              disabled={isRemoving}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {isRemoving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Removing...
                </>
              ) : (
                <>
                  <UserX className="w-4 h-4" />
                  Remove User
                </>
              )}
            </button>
          </div>
        </div>
      </BaseModal>
    </div>
  );
};
