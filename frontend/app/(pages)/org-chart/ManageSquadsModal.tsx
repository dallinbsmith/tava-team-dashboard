"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Plus, Trash2, Search, UserPlus, UserMinus, ChevronLeft, Users } from "lucide-react";
import { Squad, User } from "@/shared/types";
import { getSquads, createSquad, deleteSquad, getEmployees, updateUser } from "@/lib/api";
import { parseSquadErrorMessage } from "@/lib/errors";
import { ConfirmationModal } from "@/shared/common";

interface ManageSquadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSquadsChanged: () => void;
}

type ViewMode = "list" | "detail";

export default function ManageSquadsModal({
  isOpen,
  onClose,
  onSquadsChanged,
}: ManageSquadsModalProps) {
  const [squads, setSquads] = useState<Squad[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newSquadName, setNewSquadName] = useState("");
  const [creatingSquad, setCreatingSquad] = useState(false);
  const [deletingSquadId, setDeletingSquadId] = useState<number | null>(null);
  const [confirmDeleteSquad, setConfirmDeleteSquad] = useState<Squad | null>(null);

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedSquad, setSelectedSquad] = useState<Squad | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [addingEmployeeId, setAddingEmployeeId] = useState<number | null>(null);
  const [removingEmployeeId, setRemovingEmployeeId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
      setViewMode("list");
      setSelectedSquad(null);
      setSearchQuery("");
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [squadsData, employeesData] = await Promise.all([
        getSquads(),
        getEmployees(),
      ]);
      setSquads(squadsData);
      setEmployees(employeesData);
    } catch (err) {
      setError("Failed to load data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSquad = async () => {
    if (!newSquadName.trim()) return;

    setCreatingSquad(true);
    setError(null);
    try {
      const newSquad = await createSquad(newSquadName.trim());
      setSquads((prev) => [...prev, newSquad].sort((a, b) => a.name.localeCompare(b.name)));
      setNewSquadName("");
      onSquadsChanged();
    } catch (err) {
      setError(parseSquadErrorMessage(err));
    } finally {
      setCreatingSquad(false);
    }
  };

  const handleDeleteSquad = (squad: Squad) => {
    setConfirmDeleteSquad(squad);
  };

  const executeDeleteSquad = async () => {
    if (!confirmDeleteSquad) return;

    const squad = confirmDeleteSquad;
    setConfirmDeleteSquad(null);
    setDeletingSquadId(squad.id);
    setError(null);
    try {
      await deleteSquad(squad.id);
      setSquads((prev) => prev.filter((s) => s.id !== squad.id));
      // Update local employees data
      setEmployees((prev) =>
        prev.map((emp) => ({
          ...emp,
          squads: emp.squads?.filter((s) => s.id !== squad.id) || [],
        }))
      );
      onSquadsChanged();
    } catch (err) {
      setError("Failed to delete squad");
      console.error(err);
    } finally {
      setDeletingSquadId(null);
    }
  };

  const handleSelectSquad = (squad: Squad) => {
    setSelectedSquad(squad);
    setViewMode("detail");
    setSearchQuery("");
  };

  const handleBackToList = () => {
    setViewMode("list");
    setSelectedSquad(null);
    setSearchQuery("");
  };

  // Get employees in the selected squad
  const squadEmployees = useMemo(() => {
    if (!selectedSquad) return [];
    return employees.filter((emp) =>
      emp.squads?.some((s) => s.id === selectedSquad.id)
    );
  }, [employees, selectedSquad]);

  // Get employees NOT in the selected squad (for adding)
  const availableEmployees = useMemo(() => {
    if (!selectedSquad) return [];
    const filtered = employees.filter(
      (emp) => !emp.squads?.some((s) => s.id === selectedSquad.id)
    );
    if (!searchQuery.trim()) return filtered;
    const query = searchQuery.toLowerCase();
    return filtered.filter(
      (emp) =>
        emp.first_name.toLowerCase().includes(query) ||
        emp.last_name.toLowerCase().includes(query) ||
        emp.email.toLowerCase().includes(query)
    );
  }, [employees, selectedSquad, searchQuery]);

  const handleAddEmployee = async (employee: User) => {
    if (!selectedSquad) return;

    setAddingEmployeeId(employee.id);
    setError(null);
    try {
      const currentSquadIds = employee.squads?.map((s) => s.id) || [];
      await updateUser(employee.id, {
        squad_ids: [...currentSquadIds, selectedSquad.id],
      });
      // Update local state
      setEmployees((prev) =>
        prev.map((emp) =>
          emp.id === employee.id
            ? { ...emp, squads: [...(emp.squads || []), selectedSquad] }
            : emp
        )
      );
      onSquadsChanged();
    } catch (err) {
      setError("Failed to add employee to squad");
      console.error(err);
    } finally {
      setAddingEmployeeId(null);
    }
  };

  const handleRemoveEmployee = async (employee: User) => {
    if (!selectedSquad) return;

    setRemovingEmployeeId(employee.id);
    setError(null);
    try {
      const newSquadIds = employee.squads?.filter((s) => s.id !== selectedSquad.id).map((s) => s.id) || [];
      await updateUser(employee.id, {
        squad_ids: newSquadIds,
      });
      // Update local state
      setEmployees((prev) =>
        prev.map((emp) =>
          emp.id === employee.id
            ? { ...emp, squads: emp.squads?.filter((s) => s.id !== selectedSquad.id) || [] }
            : emp
        )
      );
      onSquadsChanged();
    } catch (err) {
      setError("Failed to remove employee from squad");
      console.error(err);
    } finally {
      setRemovingEmployeeId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <>
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
                  ? "Manage Squads"
                  : `Squad: ${selectedSquad?.name}`}
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
                {/* Add new squad */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSquadName}
                    onChange={(e) => setNewSquadName(e.target.value)}
                    placeholder="New squad name..."
                    className="flex-1 px-3 py-2 bg-theme-elevated border border-theme-border text-theme-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleCreateSquad();
                      }
                    }}
                  />
                  <button
                    onClick={handleCreateSquad}
                    disabled={!newSquadName.trim() || creatingSquad}
                    className="px-4 py-2 bg-primary-500 text-white hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>

                {/* Squad list */}
                <div className="border border-theme-border">
                  {loading ? (
                    <div className="p-4 text-center text-theme-text-muted">
                      Loading squads...
                    </div>
                  ) : squads.length === 0 ? (
                    <div className="p-4 text-center text-theme-text-muted">
                      No squads yet. Create one above.
                    </div>
                  ) : (
                    <ul className="divide-y divide-theme-border">
                      {squads.map((squad) => {
                        const memberCount = employees.filter((emp) =>
                          emp.squads?.some((s) => s.id === squad.id)
                        ).length;
                        return (
                          <li
                            key={squad.id}
                            className="flex items-center justify-between p-3 hover:bg-theme-elevated transition-colors"
                          >
                            <button
                              onClick={() => handleSelectSquad(squad)}
                              className="flex-1 text-left flex items-center gap-3"
                            >
                              <span className="text-theme-text font-medium">
                                {squad.name}
                              </span>
                              <span className="text-xs text-theme-text-muted flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {memberCount} member{memberCount !== 1 ? "s" : ""}
                              </span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSquad(squad);
                              }}
                              disabled={deletingSquadId === squad.id}
                              className="p-1.5 text-theme-text-muted hover:text-red-400 transition-colors disabled:opacity-50"
                              title="Delete squad"
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
                {/* Squad detail view */}
                <div className="space-y-4">
                  {/* Current members */}
                  <div>
                    <h3 className="text-sm font-medium text-theme-text mb-2">
                      Members ({squadEmployees.length})
                    </h3>
                    <div className="border border-theme-border max-h-48 overflow-y-auto">
                      {squadEmployees.length === 0 ? (
                        <div className="p-3 text-center text-theme-text-muted text-sm">
                          No members in this squad
                        </div>
                      ) : (
                        <ul className="divide-y divide-theme-border">
                          {squadEmployees.map((emp) => (
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
                                title="Remove from squad"
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
                            : "All employees are already in this squad"}
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
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => handleAddEmployee(emp)}
                                disabled={addingEmployeeId === emp.id}
                                className="p-1.5 text-primary-400 hover:text-primary-300 transition-colors disabled:opacity-50"
                                title="Add to squad"
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
      </div>

      <ConfirmationModal
        isOpen={!!confirmDeleteSquad}
        onClose={() => setConfirmDeleteSquad(null)}
        onConfirm={executeDeleteSquad}
        title="Confirm Delete"
        message={`Are you sure you want to delete "${confirmDeleteSquad?.name}"? This will remove all users from this squad.`}
        confirmText="Delete"
        variant="danger"
        zIndexClass="z-[60]"
      />
    </>
  );
}
