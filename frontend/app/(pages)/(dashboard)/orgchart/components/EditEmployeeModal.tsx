"use client";

import { useState, useEffect } from "react";
import { X, Check, ChevronDown, Settings, Calendar } from "lucide-react";
import { User, UpdateUserRequest } from "@/shared/types/user";
import { getSupervisors } from "@/lib/api";
import { parseErrorMessage } from "@/lib/errors";
import { sanitizeName } from "@/lib/sanitize";
import { useOrganization } from "@/providers/OrganizationProvider";
import { useUpdateEmployee } from "@/hooks";
import { cn } from "@/lib/utils";
import {
  inputStyles,
  selectTriggerStyles,
  labelStyles,
  errorAlert,
  modalOverlay,
  modalBackdrop,
  modalHeader,
  modalTitle,
} from "@/lib/styles";
import { Button } from "@/components";
import ManageSquadsModal from "./ManageSquadsModal";
import ManageDepartmentsModal from "./ManageDepartmentsModal";

interface EditEmployeeModalProps {
  employee: User;
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedEmployee: User) => void;
}

export default function EditEmployeeModal({
  employee,
  currentUser,
  isOpen,
  onClose,
  onSave,
}: EditEmployeeModalProps) {
  // Use centralized data from OrganizationProvider
  const { squads: availableSquads } = useOrganization();

  // Mutation hook for updating employee - handles cache invalidation automatically
  const updateEmployeeMutation = useUpdateEmployee();

  const [formData, setFormData] = useState({
    first_name: employee.first_name,
    last_name: employee.last_name,
    title: employee.title || "",
    department: employee.department || "",
    squadIds: employee.squads?.map((s) => s.id) || [],
    role: employee.role,
    supervisor_id: employee.supervisor_id || null,
    date_started: employee.date_started || "",
  });
  const [supervisors, setSupervisors] = useState<User[]>([]);
  const [squadDropdownOpen, setSquadDropdownOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manageSquadsOpen, setManageSquadsOpen] = useState(false);
  const [manageDepartmentsOpen, setManageDepartmentsOpen] = useState(false);

  const isLoading = updateEmployeeMutation.isPending;

  const isAdmin = currentUser.role === "admin";
  const isSupervisor = currentUser.role === "supervisor";
  const isEditingSelf = currentUser.id === employee.id;
  const canManage = isAdmin || isSupervisor;

  useEffect(() => {
    if (isOpen) {
      // Filter out any squad IDs that no longer exist
      const validSquadIds = (employee.squads?.map((s) => s.id) || []).filter(
        (id) => availableSquads.some((s) => s.id === id),
      );

      setFormData({
        first_name: employee.first_name,
        last_name: employee.last_name,
        title: employee.title || "",
        department: employee.department || "",
        squadIds: validSquadIds,
        role: employee.role,
        supervisor_id: employee.supervisor_id || null,
        date_started: employee.date_started
          ? employee.date_started.split("T")[0]
          : "",
      });
      setError(null);
      setSquadDropdownOpen(false);

      if (isAdmin) {
        getSupervisors()
          .then((data) => setSupervisors(data || []))
          .catch((err) => console.error("Failed to fetch supervisors:", err));
      }
    }
  }, [isOpen, employee, isAdmin, availableSquads]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Sanitize department input
    const sanitizedDepartment = sanitizeName(formData.department);

    const updateData: UpdateUserRequest = {};

    if (formData.first_name !== employee.first_name) {
      updateData.first_name = formData.first_name;
    }
    if (formData.last_name !== employee.last_name) {
      updateData.last_name = formData.last_name;
    }
    if (formData.title !== (employee.title || "")) {
      updateData.title = formData.title;
    }
    if (sanitizedDepartment !== (employee.department || "")) {
      updateData.department = sanitizedDepartment;
    }

    // Compare squad IDs
    const originalSquadIds = employee.squads?.map((s) => s.id).sort() || [];
    const newSquadIds = [...formData.squadIds].sort();
    const squadsChanged =
      originalSquadIds.length !== newSquadIds.length ||
      !originalSquadIds.every((id, i) => id === newSquadIds[i]);
    if (squadsChanged) {
      updateData.squad_ids = formData.squadIds;
    }

    if (isAdmin && formData.role !== employee.role) {
      updateData.role = formData.role;
    }
    if (
      isAdmin &&
      formData.supervisor_id !== (employee.supervisor_id || null)
    ) {
      updateData.supervisor_id = formData.supervisor_id;
    }

    // Check if date_started changed
    const originalDateStarted = employee.date_started
      ? employee.date_started.split("T")[0]
      : "";
    if (formData.date_started !== originalDateStarted) {
      updateData.date_started = formData.date_started || null;
    }

    // No changes - just close
    if (Object.keys(updateData).length === 0) {
      onClose();
      return;
    }

    // Use mutation - cache invalidation happens automatically
    updateEmployeeMutation.mutate(
      { id: employee.id, data: updateData },
      {
        onSuccess: (updatedEmployee) => {
          onSave(updatedEmployee);
          onClose();
        },
        onError: (err) => {
          setError(parseErrorMessage(err));
        },
      },
    );
  };

  const toggleSquad = (squadId: number) => {
    setFormData((prev) => ({
      ...prev,
      squadIds: prev.squadIds.includes(squadId)
        ? prev.squadIds.filter((id) => id !== squadId)
        : [...prev.squadIds, squadId],
    }));
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "supervisor_id"
          ? value === ""
            ? null
            : parseInt(value, 10)
          : value,
    }));
  };

  return (
    <>
      <div className={modalOverlay}>
        <div className={modalBackdrop} onClick={onClose} />
        <div className="relative bg-theme-surface border border-theme-border w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
          <div className={modalHeader}>
            <h2 className={modalTitle}>Edit Employee</h2>
            <button
              onClick={onClose}
              className="p-1 text-theme-text-muted hover:text-theme-text transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {error && <div className={errorAlert}>{error}</div>}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="first_name" className={labelStyles}>
                  First Name
                </label>
                <input
                  type="text"
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                  className={inputStyles}
                />
              </div>

              <div>
                <label htmlFor="last_name" className={labelStyles}>
                  Last Name
                </label>
                <input
                  type="text"
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  required
                  className={inputStyles}
                />
              </div>
            </div>

            <div>
              <label htmlFor="title" className={labelStyles}>
                Title
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., Software Engineer"
                className={inputStyles}
              />
            </div>

            <div>
              <label htmlFor="date_started" className={labelStyles}>
                Start Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-text-muted pointer-events-none" />
                <input
                  type="date"
                  id="date_started"
                  name="date_started"
                  value={formData.date_started}
                  onChange={handleChange}
                  className={cn(inputStyles, "pl-10")}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="department"
                  className="block text-sm font-medium text-theme-text-muted"
                >
                  Department
                </label>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => setManageDepartmentsOpen(true)}
                    className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors"
                  >
                    <Settings className="w-3 h-3" />
                    Manage
                  </button>
                )}
              </div>
              <input
                type="text"
                id="department"
                name="department"
                value={formData.department}
                onChange={handleChange}
                placeholder="e.g., Engineering"
                className={inputStyles}
              />
            </div>

            <div className="relative">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-theme-text-muted">
                  Squads
                </label>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => setManageSquadsOpen(true)}
                    className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors"
                  >
                    <Settings className="w-3 h-3" />
                    Manage
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1 mb-2 min-h-[24px]">
                {formData.squadIds.map((squadId) => {
                  const squad = availableSquads.find((s) => s.id === squadId);
                  return squad ? (
                    <span
                      key={squadId}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-primary-500/20 text-primary-300 border border-primary-500/30"
                    >
                      {squad.name}
                      <button
                        type="button"
                        onClick={() => toggleSquad(squadId)}
                        className="hover:text-red-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ) : null;
                })}
              </div>

              <button
                type="button"
                onClick={() => setSquadDropdownOpen(!squadDropdownOpen)}
                className={cn(
                  selectTriggerStyles,
                  "hover:border-theme-text-muted",
                )}
              >
                <span className="text-theme-text-muted">
                  {formData.squadIds.length === 0
                    ? "Select squads..."
                    : `${formData.squadIds.length} squad${formData.squadIds.length !== 1 ? "s" : ""} selected`}
                </span>
                <ChevronDown
                  className={cn(
                    "w-4 h-4 ml-2 shrink-0 text-theme-text-muted transition-transform",
                    squadDropdownOpen && "rotate-180",
                  )}
                />
              </button>

              {squadDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-theme-elevated border border-theme-border max-h-48 overflow-y-auto">
                  {availableSquads.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-theme-text-muted">
                      No squads available. Click &quot;Manage&quot; to create
                      one.
                    </div>
                  ) : (
                    availableSquads.map((squad) => (
                      <button
                        key={squad.id}
                        type="button"
                        onClick={() => toggleSquad(squad.id)}
                        className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-theme-surface transition-colors"
                      >
                        <div
                          className={cn(
                            "w-4 h-4 border flex items-center justify-center",
                            formData.squadIds.includes(squad.id)
                              ? "bg-primary-500 border-primary-500"
                              : "border-theme-border",
                          )}
                        >
                          {formData.squadIds.includes(squad.id) && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <span className="text-theme-text">{squad.name}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {!isEditingSelf && (
              <div>
                <label htmlFor="role" className={labelStyles}>
                  Role
                </label>
                {isAdmin ? (
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className={inputStyles}
                  >
                    <option value="employee">Employee</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="admin">Admin</option>
                  </select>
                ) : (
                  <div className="w-full px-3 py-2 bg-theme-elevated border border-theme-border text-theme-text-muted">
                    {formData.role.charAt(0).toUpperCase() +
                      formData.role.slice(1)}
                  </div>
                )}
              </div>
            )}

            {isAdmin && !isEditingSelf && (
              <div>
                <label htmlFor="supervisor_id" className={labelStyles}>
                  Supervisor
                </label>
                <select
                  id="supervisor_id"
                  name="supervisor_id"
                  value={formData.supervisor_id || ""}
                  onChange={handleChange}
                  className={inputStyles}
                >
                  <option value="">No Supervisor</option>
                  {supervisors.map((sup) => (
                    <option key={sup.id} value={sup.id}>
                      {sup.first_name} {sup.last_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-theme-border">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={isLoading}>
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      </div>

      <ManageSquadsModal
        isOpen={manageSquadsOpen}
        onClose={() => setManageSquadsOpen(false)}
        onSquadsChanged={() => {}}
      />

      <ManageDepartmentsModal
        isOpen={manageDepartmentsOpen}
        onClose={() => setManageDepartmentsOpen(false)}
        onDepartmentsChanged={() => {}}
      />
    </>
  );
}
