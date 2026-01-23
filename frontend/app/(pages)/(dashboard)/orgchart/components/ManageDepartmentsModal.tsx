"use client";

import { useState, useEffect } from "react";
import {
  X,
  Trash2,
  Pencil,
  Check,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { parseErrorMessage } from "@/lib/errors";
import { ConfirmModal, FormError } from "@/components";
import { useOrganization } from "@/providers/OrganizationProvider";
import { useDeleteDepartment, useRenameDepartment } from "@/hooks";
import { getUsersByDepartment } from "@/lib/api";
import { sanitizeName, validateName } from "@/lib/sanitize";
import { User } from "@/shared/types/user";
import Avatar from "@/shared/common/Avatar";

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

  // Mutation hooks
  const deleteDepartmentMutation = useDeleteDepartment();
  const renameDepartmentMutation = useRenameDepartment();

  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteDepartment, setConfirmDeleteDepartment] = useState<
    string | null
  >(null);

  // Edit mode
  const [editingDepartment, setEditingDepartment] = useState<string | null>(
    null,
  );
  const [editedName, setEditedName] = useState("");

  // Users view
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(
    null,
  );
  const [departmentUsers, setDepartmentUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setEditingDepartment(null);
      setEditedName("");
      setSelectedDepartment(null);
      setDepartmentUsers([]);
      setError(null);
    }
  }, [isOpen]);

  // Load users when a department is selected
  useEffect(() => {
    if (selectedDepartment) {
      setLoadingUsers(true);
      getUsersByDepartment(selectedDepartment)
        .then((users) => setDepartmentUsers(users || []))
        .catch(() => setDepartmentUsers([]))
        .finally(() => setLoadingUsers(false));
    } else {
      setDepartmentUsers([]);
    }
  }, [selectedDepartment]);

  const handleDeleteDepartment = (department: string) => {
    setConfirmDeleteDepartment(department);
  };

  const executeDeleteDepartment = () => {
    if (!confirmDeleteDepartment) return;

    const department = confirmDeleteDepartment;
    setConfirmDeleteDepartment(null);
    setError(null);

    deleteDepartmentMutation.mutate(department, {
      onSuccess: () => {
        if (selectedDepartment === department) {
          setSelectedDepartment(null);
        }
        onDepartmentsChanged();
      },
      onError: (err) => {
        setError(parseErrorMessage(err));
      },
    });
  };

  const handleStartEdit = (department: string) => {
    setEditingDepartment(department);
    setEditedName(department);
  };

  const handleCancelEdit = () => {
    setEditingDepartment(null);
    setEditedName("");
  };

  const handleSaveEdit = async () => {
    if (!editingDepartment) return;

    const sanitized = sanitizeName(editedName);
    const validationError = validateName(sanitized, "Department name");

    if (validationError) {
      setError(validationError);
      return;
    }

    if (sanitized === editingDepartment) {
      handleCancelEdit();
      return;
    }

    setError(null);
    renameDepartmentMutation.mutate(
      { oldName: editingDepartment, newName: sanitized },
      {
        onSuccess: () => {
          if (selectedDepartment === editingDepartment) {
            setSelectedDepartment(sanitized);
          }
          handleCancelEdit();
          onDepartmentsChanged();
        },
        onError: (err) => {
          setError(parseErrorMessage(err));
        },
      },
    );
  };

  const handleToggleDepartment = (department: string) => {
    if (selectedDepartment === department) {
      setSelectedDepartment(null);
    } else {
      setSelectedDepartment(department);
    }
  };

  const isMutating =
    deleteDepartmentMutation.isPending || renameDepartmentMutation.isPending;

  if (!isOpen) return null;

  // Sort departments alphabetically for display
  const sortedDepartments = [...departments].sort((a, b) => a.localeCompare(b));

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-theme-surface border border-theme-border w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
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
            <FormError error={error} />

            <div className="space-y-2">
              <p className="text-sm text-theme-text-muted">
                Departments are created by assigning them to employees. Use the
                employee edit form to add new departments.
              </p>
            </div>

            <div className="border border-theme-border">
              {loading ? (
                <div className="p-4 text-center text-theme-text-muted">
                  Loading departments...
                </div>
              ) : sortedDepartments.length === 0 ? (
                <div className="p-4 text-center text-theme-text-muted">
                  No departments yet. Assign a department to an employee to
                  create one.
                </div>
              ) : (
                <ul className="divide-y divide-theme-border">
                  {sortedDepartments.map((department) => (
                    <li key={department} className="group">
                      {editingDepartment === department ? (
                        <div className="flex items-center gap-2 p-3">
                          <input
                            type="text"
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value)}
                            className="flex-1 px-2 py-1 bg-theme-elevated border border-theme-border text-theme-text text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleSaveEdit();
                              } else if (e.key === "Escape") {
                                handleCancelEdit();
                              }
                            }}
                          />
                          <button
                            onClick={handleSaveEdit}
                            disabled={isMutating || !editedName.trim()}
                            className="p-1.5 text-green-400 hover:text-green-300 transition-colors disabled:opacity-50"
                            title="Save"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-1.5 text-theme-text-muted hover:text-theme-text transition-colors"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div
                            className="flex items-center justify-between p-3 hover:bg-theme-elevated transition-colors cursor-pointer"
                            onClick={() => handleToggleDepartment(department)}
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {selectedDepartment === department ? (
                                <ChevronDown className="w-4 h-4 text-theme-text-muted flex-shrink-0" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-theme-text-muted flex-shrink-0" />
                              )}
                              <span className="text-theme-text truncate">
                                {department}
                              </span>
                              {selectedDepartment === department &&
                                !loadingUsers && (
                                  <span className="text-xs text-theme-text-muted">
                                    ({departmentUsers.length}{" "}
                                    {departmentUsers.length === 1
                                      ? "user"
                                      : "users"}
                                    )
                                  </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartEdit(department);
                                }}
                                disabled={isMutating}
                                className="p-1.5 text-theme-text-muted hover:text-primary-400 transition-colors disabled:opacity-50"
                                title="Rename department"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteDepartment(department);
                                }}
                                disabled={isMutating}
                                className="p-1.5 text-theme-text-muted hover:text-red-400 transition-colors disabled:opacity-50"
                                title="Delete department"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {selectedDepartment === department && (
                            <div className="bg-theme-elevated border-t border-theme-border">
                              {loadingUsers ? (
                                <div className="p-3 text-center text-sm text-theme-text-muted">
                                  Loading users...
                                </div>
                              ) : departmentUsers.length === 0 ? (
                                <div className="p-3 text-center text-sm text-theme-text-muted">
                                  No users in this department
                                </div>
                              ) : (
                                <ul className="divide-y divide-theme-border">
                                  {departmentUsers.map((user) => (
                                    <li
                                      key={user.id}
                                      className="flex items-center gap-3 p-3"
                                    >
                                      <Avatar
                                        s3AvatarUrl={user.avatar_url}
                                        firstName={user.first_name}
                                        lastName={user.last_name}
                                        size="sm"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-theme-text truncate">
                                          {user.first_name} {user.last_name}
                                        </div>
                                        {user.title && (
                                          <div className="text-xs text-theme-text-muted truncate">
                                            {user.title}
                                          </div>
                                        )}
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )}
                        </>
                      )}
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

      <ConfirmModal
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
