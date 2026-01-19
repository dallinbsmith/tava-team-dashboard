"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Trash2, Search, UserPlus, UserMinus, ChevronLeft, Users, AlertTriangle } from "lucide-react";
import { User } from "@/shared/types";
import { getDepartments, deleteDepartment, getEmployees, updateUser } from "@/lib/api";
import { parseErrorMessage } from "@/lib/errors";

// Confirmation modal component
function ConfirmDeleteModal({
  isOpen,
  departmentName,
  memberCount,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  isOpen: boolean;
  departmentName: string;
  memberCount: number;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-theme-surface border border-theme-border w-full max-w-md mx-4 shadow-xl">
        <div className="p-4 border-b border-theme-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-900/30 rounded-full">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-theme-text">
              Delete Department
            </h3>
          </div>
        </div>
        <div className="p-4">
          <p className="text-theme-text-muted">
            Are you sure you want to delete <span className="font-semibold text-theme-text">"{departmentName}"</span>?
          </p>
          {memberCount > 0 && (
            <p className="mt-2 text-sm text-amber-400">
              This will clear the department field for {memberCount} employee{memberCount !== 1 ? "s" : ""}.
            </p>
          )}
        </div>
        <div className="flex justify-end gap-3 p-4 border-t border-theme-border">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-theme-text-muted hover:text-theme-text transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ManageDepartmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDepartmentsChanged: () => void;
}

type ViewMode = "list" | "detail";

export default function ManageDepartmentsModal({
  isOpen,
  onClose,
  onDepartmentsChanged,
}: ManageDepartmentsModalProps) {
  const [departments, setDepartments] = useState<string[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingDepartment, setDeletingDepartment] = useState<string | null>(null);
  const [confirmDeleteDepartment, setConfirmDeleteDepartment] = useState<string | null>(null);

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [addingEmployeeId, setAddingEmployeeId] = useState<number | null>(null);
  const [removingEmployeeId, setRemovingEmployeeId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
      setViewMode("list");
      setSelectedDepartment(null);
      setSearchQuery("");
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [departmentsData, employeesData] = await Promise.all([
        getDepartments(),
        getEmployees(),
      ]);
      setDepartments(departmentsData);
      setEmployees(employeesData);
    } catch (err) {
      setError("Failed to load data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDepartment = (department: string) => {
    setConfirmDeleteDepartment(department);
  };

  const executeDeleteDepartment = async () => {
    if (!confirmDeleteDepartment) return;

    const department = confirmDeleteDepartment;
    setDeletingDepartment(department);
    setError(null);
    try {
      await deleteDepartment(department);
      setDepartments((prev) => prev.filter((d) => d !== department));
      // Update local employees data
      setEmployees((prev) =>
        prev.map((emp) =>
          emp.department === department ? { ...emp, department: "" } : emp
        )
      );
      onDepartmentsChanged();
      setConfirmDeleteDepartment(null);
    } catch (err) {
      setError(parseErrorMessage(err));
    } finally {
      setDeletingDepartment(null);
    }
  };

  const getMemberCount = (department: string) => {
    return employees.filter((emp) => emp.department === department).length;
  };

  const handleSelectDepartment = (department: string) => {
    setSelectedDepartment(department);
    setViewMode("detail");
    setSearchQuery("");
  };

  const handleBackToList = () => {
    setViewMode("list");
    setSelectedDepartment(null);
    setSearchQuery("");
  };

  // Get employees in the selected department
  const departmentEmployees = useMemo(() => {
    if (!selectedDepartment) return [];
    return employees.filter((emp) => emp.department === selectedDepartment);
  }, [employees, selectedDepartment]);

  // Get employees NOT in the selected department (for adding)
  const availableEmployees = useMemo(() => {
    if (!selectedDepartment) return [];
    const filtered = employees.filter((emp) => emp.department !== selectedDepartment);
    if (!searchQuery.trim()) return filtered;
    const query = searchQuery.toLowerCase();
    return filtered.filter(
      (emp) =>
        emp.first_name.toLowerCase().includes(query) ||
        emp.last_name.toLowerCase().includes(query) ||
        emp.email.toLowerCase().includes(query)
    );
  }, [employees, selectedDepartment, searchQuery]);

  const handleAddEmployee = async (employee: User) => {
    if (!selectedDepartment) return;

    setAddingEmployeeId(employee.id);
    setError(null);
    try {
      await updateUser(employee.id, {
        department: selectedDepartment,
      });
      // Update local state
      setEmployees((prev) =>
        prev.map((emp) =>
          emp.id === employee.id
            ? { ...emp, department: selectedDepartment }
            : emp
        )
      );
      onDepartmentsChanged();
    } catch (err) {
      setError("Failed to add employee to department");
      console.error(err);
    } finally {
      setAddingEmployeeId(null);
    }
  };

  const handleRemoveEmployee = async (employee: User) => {
    setRemovingEmployeeId(employee.id);
    setError(null);
    try {
      await updateUser(employee.id, {
        department: "",
      });
      // Update local state
      setEmployees((prev) =>
        prev.map((emp) =>
          emp.id === employee.id ? { ...emp, department: "" } : emp
        )
      );
      onDepartmentsChanged();
    } catch (err) {
      setError("Failed to remove employee from department");
      console.error(err);
    } finally {
      setRemovingEmployeeId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className="relative bg-theme-surface border border-theme-border w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-theme-border">
          <div className="flex items-center gap-2">
            {viewMode === "detail" && (
              <button
                onClick={handleBackToList}
                className="p-1 text-theme-text-muted hover:text-theme-text transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-lg font-semibold text-theme-text">
              {viewMode === "list"
                ? "Manage Departments"
                : `Department: ${selectedDepartment}`}
            </h2>
          </div>
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

          {viewMode === "list" ? (
            <>
              <p className="text-sm text-theme-text-muted">
                Departments are created by assigning them to employees. Click a department to view and manage its members, or delete to clear it from all employees.
              </p>

              {/* Department list */}
              <div className="border border-theme-border">
                {loading ? (
                  <div className="p-4 text-center text-theme-text-muted">
                    Loading departments...
                  </div>
                ) : departments.length === 0 ? (
                  <div className="p-4 text-center text-theme-text-muted">
                    No departments yet. Assign a department to an employee to create one.
                  </div>
                ) : (
                  <ul className="divide-y divide-theme-border">
                    {departments.map((department) => {
                      const memberCount = employees.filter(
                        (emp) => emp.department === department
                      ).length;
                      return (
                        <li
                          key={department}
                          className="flex items-center justify-between p-3 hover:bg-theme-elevated transition-colors"
                        >
                          <button
                            onClick={() => handleSelectDepartment(department)}
                            className="flex-1 text-left flex items-center gap-3"
                          >
                            <span className="text-theme-text font-medium">
                              {department}
                            </span>
                            <span className="text-xs text-theme-text-muted flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {memberCount} member{memberCount !== 1 ? "s" : ""}
                            </span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDepartment(department);
                            }}
                            disabled={deletingDepartment === department}
                            className="p-1.5 text-theme-text-muted hover:text-red-400 transition-colors disabled:opacity-50"
                            title="Delete department"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Department detail view */}
              <div className="space-y-4">
                {/* Current members */}
                <div>
                  <h3 className="text-sm font-medium text-theme-text mb-2">
                    Members ({departmentEmployees.length})
                  </h3>
                  <div className="border border-theme-border max-h-48 overflow-y-auto">
                    {departmentEmployees.length === 0 ? (
                      <div className="p-3 text-center text-theme-text-muted text-sm">
                        No members in this department
                      </div>
                    ) : (
                      <ul className="divide-y divide-theme-border">
                        {departmentEmployees.map((emp) => (
                          <li
                            key={emp.id}
                            className="flex items-center justify-between p-3 hover:bg-theme-elevated transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              {emp.avatar_url ? (
                                <img
                                  src={emp.avatar_url}
                                  alt=""
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400 text-xs font-medium">
                                  {emp.first_name[0]}
                                  {emp.last_name[0]}
                                </div>
                              )}
                              <div>
                                <div className="text-theme-text text-sm font-medium">
                                  {emp.first_name} {emp.last_name}
                                </div>
                                <div className="text-theme-text-muted text-xs">
                                  {emp.title || emp.role}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemoveEmployee(emp)}
                              disabled={removingEmployeeId === emp.id}
                              className="p-1.5 text-theme-text-muted hover:text-red-400 transition-colors disabled:opacity-50"
                              title="Remove from department"
                            >
                              <UserMinus className="w-4 h-4" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Add employees */}
                <div>
                  <h3 className="text-sm font-medium text-theme-text mb-2">
                    Add Employees
                  </h3>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-text-muted" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search employees..."
                      className="w-full pl-10 pr-3 py-2 bg-theme-elevated border border-theme-border text-theme-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div className="border border-theme-border max-h-48 overflow-y-auto">
                    {availableEmployees.length === 0 ? (
                      <div className="p-3 text-center text-theme-text-muted text-sm">
                        {searchQuery
                          ? "No matching employees found"
                          : "All employees are already in this department"}
                      </div>
                    ) : (
                      <ul className="divide-y divide-theme-border">
                        {availableEmployees.slice(0, 20).map((emp) => (
                          <li
                            key={emp.id}
                            className="flex items-center justify-between p-3 hover:bg-theme-elevated transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              {emp.avatar_url ? (
                                <img
                                  src={emp.avatar_url}
                                  alt=""
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400 text-xs font-medium">
                                  {emp.first_name[0]}
                                  {emp.last_name[0]}
                                </div>
                              )}
                              <div>
                                <div className="text-theme-text text-sm font-medium">
                                  {emp.first_name} {emp.last_name}
                                </div>
                                <div className="text-theme-text-muted text-xs">
                                  {emp.title || emp.role}
                                  {emp.department && (
                                    <span className="ml-1 text-theme-text-muted/60">
                                      ({emp.department})
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleAddEmployee(emp)}
                              disabled={addingEmployeeId === emp.id}
                              className="p-1.5 text-primary-400 hover:text-primary-300 transition-colors disabled:opacity-50"
                              title="Add to department"
                            >
                              <UserPlus className="w-4 h-4" />
                            </button>
                          </li>
                        ))}
                        {availableEmployees.length > 20 && (
                          <li className="p-2 text-center text-theme-text-muted text-xs">
                            Showing first 20 results. Use search to find more.
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
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

      {/* Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={confirmDeleteDepartment !== null}
        departmentName={confirmDeleteDepartment || ""}
        memberCount={confirmDeleteDepartment ? getMemberCount(confirmDeleteDepartment) : 0}
        onConfirm={executeDeleteDepartment}
        onCancel={() => setConfirmDeleteDepartment(null)}
        isDeleting={deletingDepartment !== null}
      />
    </div>
  );
}
