"use client";

import { useState } from "react";
import { X, Shield } from "lucide-react";
import { User, Squad } from "@/shared/types/user";
import Avatar from "@/shared/common/Avatar";

interface DraftEditModalProps {
  employee: User;
  squads: Squad[];
  departments: string[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (newDepartment: string, squadIds: number[], newRole?: "employee" | "supervisor") => void;
}

export default function DraftEditModal({
  employee,
  squads,
  departments,
  isOpen,
  onClose,
  onSave,
}: DraftEditModalProps) {
  const [department, setDepartment] = useState(employee.department || "");
  const [selectedSquadIds, setSelectedSquadIds] = useState<number[]>(
    employee.squads?.map((s) => s.id) || []
  );
  const [role, setRole] = useState<"employee" | "supervisor">(
    employee.role === "admin" ? "supervisor" : employee.role
  );
  const [isCreatingDepartment, setIsCreatingDepartment] = useState(false);
  const [newDepartmentName, setNewDepartmentName] = useState("");

  const originalSquadIds = employee.squads?.map((s) => s.id).sort() || [];
  const currentSquadIds = [...selectedSquadIds].sort();
  const squadsChanged =
    originalSquadIds.length !== currentSquadIds.length ||
    !originalSquadIds.every((id, i) => id === currentSquadIds[i]);

  const originalRole = employee.role === "admin" ? "supervisor" : employee.role;
  const roleChanged = role !== originalRole;

  const hasChanges = department !== (employee.department || "") || squadsChanged || roleChanged;

  if (!isOpen) return null;

  const handleDepartmentChange = (value: string) => {
    if (value === "__create_new__") {
      setIsCreatingDepartment(true);
      setNewDepartmentName("");
    } else {
      setDepartment(value);
      setIsCreatingDepartment(false);
    }
  };

  const toggleSquad = (squadId: number) => {
    setSelectedSquadIds((prev) =>
      prev.includes(squadId) ? prev.filter((id) => id !== squadId) : [...prev, squadId]
    );
  };

  const handleCreateDepartment = () => {
    if (newDepartmentName.trim()) {
      setDepartment(newDepartmentName.trim());
      setIsCreatingDepartment(false);
      setNewDepartmentName("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-theme-surface border border-theme-border rounded-lg w-full max-w-md mx-4 shadow-2xl">
        <div className="p-4 border-b border-theme-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-theme-text">Edit Employee</h2>
          <button onClick={onClose} className="p-1 text-theme-text-muted hover:text-theme-text">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-3 mb-6 p-3 bg-theme-elevated rounded">
            <Avatar
              s3AvatarUrl={employee.avatar_url}
              firstName={employee.first_name}
              lastName={employee.last_name}
              size="md"
            />
            <div>
              <div className="font-medium text-theme-text">
                {employee.first_name} {employee.last_name}
              </div>
              <div className="text-sm text-theme-text-muted">{employee.title || employee.role}</div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-theme-text mb-1">Department</label>
              {isCreatingDepartment ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newDepartmentName}
                    onChange={(e) => setNewDepartmentName(e.target.value)}
                    placeholder="Enter new department name..."
                    className="flex-1 px-3 py-2 border border-theme-border rounded text-sm bg-theme-elevated text-theme-text focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleCreateDepartment}
                    disabled={!newDepartmentName.trim()}
                    className="px-3 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50 text-sm"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreatingDepartment(false)}
                    className="px-3 py-2 border border-theme-border text-theme-text rounded hover:bg-theme-elevated text-sm"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <select
                  value={department}
                  onChange={(e) => handleDepartmentChange(e.target.value)}
                  className="w-full px-3 py-2 border border-theme-border rounded text-sm bg-theme-elevated text-theme-text focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select a department...</option>
                  {departments.map((d, index) => (
                    <option key={`dept-${d}-${index}`} value={d}>
                      {d}
                    </option>
                  ))}
                  <option value="__create_new__">+ Create new department</option>
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-theme-text mb-1">Squads</label>
              <div className="border border-theme-border rounded bg-theme-elevated p-2 max-h-40 overflow-y-auto">
                {squads.length === 0 ? (
                  <p className="text-sm text-theme-text-muted p-2">No squads available</p>
                ) : (
                  squads.map((squad, index) => (
                    <label
                      key={`squad-${squad.id}-${index}`}
                      className="flex items-center gap-2 p-2 hover:bg-theme-surface rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSquadIds.includes(squad.id)}
                        onChange={() => toggleSquad(squad.id)}
                        className="w-4 h-4 text-primary-500 border-theme-border rounded focus:ring-primary-500"
                      />
                      <span className="text-sm text-theme-text">{squad.name}</span>
                    </label>
                  ))
                )}
              </div>
              {selectedSquadIds.length > 0 && (
                <p className="text-xs text-theme-text-muted mt-1">
                  {selectedSquadIds.length} squad{selectedSquadIds.length !== 1 ? "s" : ""} selected
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-theme-text mb-1">Role</label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="employee"
                    checked={role === "employee"}
                    onChange={() => setRole("employee")}
                    className="w-4 h-4 text-primary-500 border-theme-border focus:ring-primary-500"
                  />
                  <span className="text-sm text-theme-text">Employee</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="supervisor"
                    checked={role === "supervisor"}
                    onChange={() => setRole("supervisor")}
                    className="w-4 h-4 text-primary-500 border-theme-border focus:ring-primary-500"
                  />
                  <div className="flex items-center gap-1">
                    <Shield className="w-4 h-4 text-purple-500" />
                    <span className="text-sm text-theme-text">Supervisor</span>
                  </div>
                </label>
              </div>
              {roleChanged && (
                <p className="text-xs text-purple-400 mt-1">
                  {role === "supervisor"
                    ? "This employee will be promoted to supervisor"
                    : "This supervisor will be demoted to employee"}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-theme-border flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-theme-border text-theme-text rounded hover:bg-theme-elevated"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(department, selectedSquadIds, roleChanged ? role : undefined)}
            disabled={!hasChanges}
            className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
