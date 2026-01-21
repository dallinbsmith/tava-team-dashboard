"use client";

import { useState } from "react";
import { BaseModal } from "./BaseModal";
import { createEmployeeGraphQL, CreateEmployeeInput } from "@/lib/graphql";
import { parseErrorMessage, parseSquadErrorMessage } from "@/lib/errors";
import { User, Squad } from "@/shared/types/user";
import { CheckCircle, ChevronDown, X, Plus, Building2, Users, User as UserIcon, Shield, Calendar } from "lucide-react";

interface CreateEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (employee: User) => void;
  squads: Squad[];
  departments: string[];
  onAddSquad: (name: string) => Promise<Squad>;
}

export function CreateEmployeeModal({
  isOpen,
  onClose,
  onCreated,
  squads,
  departments,
  onAddSquad,
}: CreateEmployeeModalProps) {
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdEmployee, setCreatedEmployee] = useState<User | null>(null);

  const [newEmployee, setNewEmployee] = useState<CreateEmployeeInput>({
    email: "",
    first_name: "",
    last_name: "",
    role: "employee",
    department: "",
    squad_ids: [],
    date_started: "",
  });

  // Squad dropdown state
  const [squadDropdownOpen, setSquadDropdownOpen] = useState(false);
  const [newSquadName, setNewSquadName] = useState("");
  const [creatingSquad, setCreatingSquad] = useState(false);

  // Department dropdown state
  const [departmentDropdownOpen, setDepartmentDropdownOpen] = useState(false);
  const [departmentSearch, setDepartmentSearch] = useState("");

  const resetForm = () => {
    setNewEmployee({
      email: "",
      first_name: "",
      last_name: "",
      role: "employee",
      department: "",
      squad_ids: [],
      date_started: "",
    });
    setSquadDropdownOpen(false);
    setNewSquadName("");
    setDepartmentDropdownOpen(false);
    setDepartmentSearch("");
    setCreateError(null);
    setCreatedEmployee(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const toggleSquad = (squadId: number) => {
    const currentSquads = newEmployee.squad_ids || [];
    if (currentSquads.includes(squadId)) {
      setNewEmployee({
        ...newEmployee,
        squad_ids: currentSquads.filter((id) => id !== squadId),
      });
    } else {
      setNewEmployee({
        ...newEmployee,
        squad_ids: [...currentSquads, squadId],
      });
    }
  };

  const removeSquad = (squadId: number) => {
    setNewEmployee({
      ...newEmployee,
      squad_ids: (newEmployee.squad_ids || []).filter((id) => id !== squadId),
    });
  };

  const handleCreateSquad = async () => {
    if (!newSquadName.trim()) return;
    setCreatingSquad(true);
    try {
      const squad = await onAddSquad(newSquadName.trim());
      setNewEmployee({
        ...newEmployee,
        squad_ids: [...(newEmployee.squad_ids || []), squad.id],
      });
      setNewSquadName("");
    } catch (e) {
      console.error("Failed to create squad:", e);
      setCreateError(parseSquadErrorMessage(e));
    } finally {
      setCreatingSquad(false);
    }
  };

  const getSelectedSquads = () => {
    return squads.filter((s) => (newEmployee.squad_ids || []).includes(s.id));
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    try {
      const employee = await createEmployeeGraphQL(newEmployee);
      setCreatedEmployee(employee);
      onCreated(employee);
    } catch (e: unknown) {
      setCreateError(parseErrorMessage(e));
    } finally {
      setCreating(false);
    }
  };

  if (createdEmployee) {
    return (
      <BaseModal isOpen={isOpen} onClose={handleClose} title="Add New Employee">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-green-900/40 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-6 h-6 text-green-400" />
          </div>
          <h4 className="text-lg font-medium text-theme-text">Employee Created!</h4>
          <p className="text-sm text-theme-text-muted mt-1">
            {createdEmployee.first_name} {createdEmployee.last_name} has been added to your team.
          </p>
        </div>

        <div className="bg-theme-elevated p-4 mb-4">
          <p className="text-sm text-theme-text-muted">
            The employee will receive an invitation to set their password and will also be added to your Jira workspace (if configured).
          </p>
        </div>

        <button
          onClick={handleClose}
          className="w-full px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 transition-colors"
        >
          Done
        </button>
      </BaseModal>
    );
  }

  return (
    <BaseModal isOpen={isOpen} onClose={handleClose} title="Add New Employee">
      <form onSubmit={handleCreateEmployee}>
        <div className="mb-4">
          <label className="block text-sm font-medium text-theme-text mb-1">
            Email Address
          </label>
          <input
            type="email"
            value={newEmployee.email}
            onChange={(e) =>
              setNewEmployee({ ...newEmployee, email: e.target.value })
            }
            className="w-full px-3 py-2 border border-theme-border bg-theme-elevated text-theme-text focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="employee@company.com"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              First Name
            </label>
            <input
              type="text"
              value={newEmployee.first_name}
              onChange={(e) =>
                setNewEmployee({ ...newEmployee, first_name: e.target.value })
              }
              className="w-full px-3 py-2 border border-theme-border bg-theme-elevated text-theme-text focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="John"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Last Name
            </label>
            <input
              type="text"
              value={newEmployee.last_name}
              onChange={(e) =>
                setNewEmployee({ ...newEmployee, last_name: e.target.value })
              }
              className="w-full px-3 py-2 border border-theme-border bg-theme-elevated text-theme-text focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Doe"
              required
            />
          </div>
        </div>

        {/* Start Date */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-theme-text mb-1">
            <Calendar className="w-4 h-4 inline mr-1" />
            Start Date
          </label>
          <input
            type="date"
            value={newEmployee.date_started || ""}
            onChange={(e) =>
              setNewEmployee({ ...newEmployee, date_started: e.target.value })
            }
            className="w-full px-3 py-2 border border-theme-border bg-theme-elevated text-theme-text focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Department Dropdown */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-theme-text mb-1">
            <Building2 className="w-4 h-4 inline mr-1" />
            Department
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setDepartmentDropdownOpen(!departmentDropdownOpen)}
              className="w-full px-3 py-2 border border-theme-border bg-theme-elevated text-theme-text text-left flex items-center justify-between focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <span className={newEmployee.department ? "text-theme-text" : "text-theme-text-muted"}>
                {newEmployee.department || "Select department..."}
              </span>
              <ChevronDown
                className={`w-4 h-4 ml-2 shrink-0 transition-transform ${departmentDropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            {departmentDropdownOpen && (
              <div className="absolute z-10 w-full mt-1 bg-theme-surface border border-theme-border shadow-lg max-h-60 overflow-auto">
                <div className="p-2 border-b border-theme-border">
                  <input
                    type="text"
                    value={departmentSearch}
                    onChange={(e) => setDepartmentSearch(e.target.value)}
                    placeholder="Search or create department..."
                    className="w-full px-2 py-1 text-sm border border-theme-border bg-theme-elevated text-theme-text"
                    autoFocus
                  />
                </div>

                {departments
                  .filter((dept) =>
                    dept.toLowerCase().includes(departmentSearch.toLowerCase())
                  )
                  .map((dept) => (
                    <button
                      key={dept}
                      type="button"
                      onClick={() => {
                        setNewEmployee({ ...newEmployee, department: dept });
                        setDepartmentDropdownOpen(false);
                        setDepartmentSearch("");
                      }}
                      className={`w-full px-3 py-2 text-left hover:bg-theme-elevated ${newEmployee.department === dept ? "bg-primary-600/20 text-primary-400" : "text-theme-text"}`}
                    >
                      {dept}
                    </button>
                  ))}

                {departmentSearch.trim() &&
                  !departments.some(
                    (d) => d.toLowerCase() === departmentSearch.toLowerCase()
                  ) && (
                    <button
                      type="button"
                      onClick={() => {
                        setNewEmployee({ ...newEmployee, department: departmentSearch.trim() });
                        setDepartmentDropdownOpen(false);
                        setDepartmentSearch("");
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-theme-elevated text-primary-400 border-t border-theme-border flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Create &quot;{departmentSearch.trim()}&quot;
                    </button>
                  )}

                {departments.length === 0 && !departmentSearch.trim() && (
                  <div className="px-3 py-2 text-sm text-theme-text-muted">
                    Type to create a new department
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Squads Multi-Select */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-theme-text mb-1">
            <Users className="w-4 h-4 inline mr-1" />
            Squads
          </label>

          {getSelectedSquads().length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {getSelectedSquads().map((squad) => (
                <span
                  key={squad.id}
                  className="inline-flex items-center px-2 py-1 text-xs bg-primary-600/20 text-primary-400 border border-primary-600/30"
                >
                  {squad.name}
                  <button
                    type="button"
                    onClick={() => removeSquad(squad.id)}
                    className="ml-1 hover:text-primary-300"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="relative">
            <button
              type="button"
              onClick={() => setSquadDropdownOpen(!squadDropdownOpen)}
              className="w-full px-3 py-2 border border-theme-border bg-theme-elevated text-theme-text text-left flex items-center justify-between focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <span className="text-theme-text-muted">
                {getSelectedSquads().length === 0
                  ? "Select squads..."
                  : `${getSelectedSquads().length} squad(s) selected`}
              </span>
              <ChevronDown
                className={`w-4 h-4 ml-2 shrink-0 transition-transform ${squadDropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            {squadDropdownOpen && (
              <div className="absolute z-10 w-full mt-1 bg-theme-surface border border-theme-border shadow-lg max-h-60 overflow-auto">
                {squads.map((squad) => (
                  <label
                    key={squad.id}
                    className="flex items-center px-3 py-2 hover:bg-theme-elevated cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={(newEmployee.squad_ids || []).includes(squad.id)}
                      onChange={() => toggleSquad(squad.id)}
                      className="mr-2"
                    />
                    <span className="text-theme-text">{squad.name}</span>
                  </label>
                ))}

                <div className="border-t border-theme-border p-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newSquadName}
                      onChange={(e) => setNewSquadName(e.target.value)}
                      placeholder="New squad name..."
                      className="flex-1 px-2 py-1 text-sm border border-theme-border bg-theme-elevated text-theme-text"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleCreateSquad();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleCreateSquad}
                      disabled={creatingSquad || !newSquadName.trim()}
                      className="px-2 py-1 bg-primary-600 text-white text-sm hover:bg-primary-700 disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <p className="text-xs text-theme-text-muted mt-1">
            Assign the employee to one or more squads
          </p>
        </div>

        {/* Role Radio Buttons */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-theme-text mb-2">
            Role
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setNewEmployee({ ...newEmployee, role: "employee" })}
              className={`p-3 border text-left transition-colors ${
                newEmployee.role === "employee"
                  ? "border-primary-500 bg-primary-500/10"
                  : "border-theme-border bg-theme-elevated hover:border-theme-text-muted"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <UserIcon
                  className={`w-4 h-4 ${
                    newEmployee.role === "employee"
                      ? "text-primary-400"
                      : "text-theme-text-muted"
                  }`}
                />
                <span
                  className={`font-medium ${
                    newEmployee.role === "employee"
                      ? "text-primary-400"
                      : "text-theme-text"
                  }`}
                >
                  Employee
                </span>
              </div>
              <p className="text-xs text-theme-text-muted">Managed by supervisor</p>
            </button>

            <button
              type="button"
              onClick={() => setNewEmployee({ ...newEmployee, role: "supervisor" })}
              className={`p-3 border text-left transition-colors ${
                newEmployee.role === "supervisor"
                  ? "border-primary-500 bg-primary-500/10"
                  : "border-theme-border bg-theme-elevated hover:border-theme-text-muted"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Shield
                  className={`w-4 h-4 ${
                    newEmployee.role === "supervisor"
                      ? "text-primary-400"
                      : "text-theme-text-muted"
                  }`}
                />
                <span
                  className={`font-medium ${
                    newEmployee.role === "supervisor"
                      ? "text-primary-400"
                      : "text-theme-text"
                  }`}
                >
                  Supervisor
                </span>
              </div>
              <p className="text-xs text-theme-text-muted">Can manage direct reports</p>
            </button>
          </div>
        </div>

        {createError && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-500/30">
            <p className="text-sm text-red-400">{createError}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 px-4 py-2 border border-theme-border text-theme-text hover:bg-theme-elevated transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={creating}
            className="flex-1 px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {creating ? "Creating..." : "Add Employee"}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}

export default CreateEmployeeModal;
