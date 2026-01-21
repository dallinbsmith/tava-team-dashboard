"use client";

import { useState } from "react";
import { X, Trash2 } from "lucide-react";
import { parseErrorMessage } from "@/lib/errors";
import ConfirmationModal from "@/shared/common/ConfirmationModal";
import { useOrganization } from "@/providers/OrganizationProvider";
import { useDeleteDepartment } from "@/hooks";

interface ManageDepartmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDepartmentsChanged: () => void;
}

export default function ManageDepartmentsModal({
  isOpen,
  onClose,
  onDepartmentsChanged,
}: ManageDepartmentsModalProps) {
  // Use centralized data from OrganizationProvider
  const { departments, loading } = useOrganization();

  // Mutation hook for deleting departments - handles cache invalidation automatically
  const deleteDepartmentMutation = useDeleteDepartment();

  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteDepartment, setConfirmDeleteDepartment] = useState<string | null>(null);

  const handleDeleteDepartment = (department: string) => {
    setConfirmDeleteDepartment(department);
  };

  const executeDeleteDepartment = () => {
    if (!confirmDeleteDepartment) return;

    const department = confirmDeleteDepartment;
    setConfirmDeleteDepartment(null);
    setError(null);

    // Use mutation - cache invalidation happens automatically
    deleteDepartmentMutation.mutate(department, {
      onSuccess: () => {
        onDepartmentsChanged();
      },
      onError: (err) => {
        setError(parseErrorMessage(err));
      },
    });
  };

  if (!isOpen) return null;

  // Sort departments alphabetically for display
  const sortedDepartments = [...departments].sort((a, b) => a.localeCompare(b));

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className="relative bg-theme-surface border border-theme-border w-full max-w-md mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-theme-border">
          <h2 className="text-lg font-semibold text-theme-text">
            Manage Departments
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-theme-text-muted hover:text-theme-text transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="bg-red-900/30 border border-red-500/30 p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <p className="text-sm text-theme-text-muted">
            Departments are created by assigning them to employees. Delete a department to clear it from all employees.
          </p>

          {/* Department list */}
          <div className="border border-theme-border">
            {loading ? (
              <div className="p-4 text-center text-theme-text-muted">
                Loading departments...
              </div>
            ) : sortedDepartments.length === 0 ? (
              <div className="p-4 text-center text-theme-text-muted">
                No departments yet. Assign a department to an employee to create one.
              </div>
            ) : (
              <ul className="divide-y divide-theme-border">
                {sortedDepartments.map((department) => (
                  <li
                    key={department}
                    className="flex items-center justify-between p-3 hover:bg-theme-elevated transition-colors"
                  >
                    <span className="text-theme-text">{department}</span>
                    <button
                      onClick={() => handleDeleteDepartment(department)}
                      disabled={deleteDepartmentMutation.isPending}
                      className="p-1.5 text-theme-text-muted hover:text-red-400 transition-colors disabled:opacity-50"
                      title="Delete department"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex justify-end p-4 border-t border-theme-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-theme-text-muted hover:text-theme-text transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>

      <ConfirmationModal
        isOpen={!!confirmDeleteDepartment}
        onClose={() => setConfirmDeleteDepartment(null)}
        onConfirm={executeDeleteDepartment}
        title="Confirm Delete"
        message={`Are you sure you want to delete "${confirmDeleteDepartment}"? This will clear the department field for all employees in this department.`}
        confirmText="Delete"
        variant="danger"
        zIndexClass="z-[60]"
      />
    </>
  );
}
