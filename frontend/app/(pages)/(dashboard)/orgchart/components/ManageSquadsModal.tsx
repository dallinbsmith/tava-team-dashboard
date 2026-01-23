"use client";

import { useState, useEffect } from "react";
import { X, Plus, Trash2, Pencil, Check, ChevronRight, ChevronDown } from "lucide-react";
import { Squad, User } from "@/shared/types/user";
import { parseSquadErrorMessage } from "@/lib/errors";
import { useSquadsQuery } from "@/hooks";
import { getUsersBySquad } from "@/lib/api";
import ConfirmationModal from "@/shared/common/ConfirmationModal";
import Avatar from "@/shared/common/Avatar";

interface ManageSquadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSquadsChanged: () => void;
}

export default function ManageSquadsModal({
  isOpen,
  onClose,
  onSquadsChanged,
}: ManageSquadsModalProps) {
  // Use squads query hook which includes mutations with automatic cache invalidation
  const { squads, isLoading: squadsLoading, addSquad, updateSquad, removeSquad, isMutating } = useSquadsQuery();

  const [error, setError] = useState<string | null>(null);
  const [newSquadName, setNewSquadName] = useState("");
  const [confirmDeleteSquad, setConfirmDeleteSquad] = useState<Squad | null>(null);

  // Edit mode
  const [editingSquad, setEditingSquad] = useState<Squad | null>(null);
  const [editedName, setEditedName] = useState("");

  // Users view
  const [selectedSquad, setSelectedSquad] = useState<Squad | null>(null);
  const [squadUsers, setSquadUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setNewSquadName("");
      setEditingSquad(null);
      setEditedName("");
      setSelectedSquad(null);
      setSquadUsers([]);
      setError(null);
    }
  }, [isOpen]);

  // Load users when a squad is selected
  useEffect(() => {
    if (selectedSquad) {
      setLoadingUsers(true);
      getUsersBySquad(selectedSquad.id)
        .then((users) => setSquadUsers(users))
        .catch(() => setSquadUsers([]))
        .finally(() => setLoadingUsers(false));
    } else {
      setSquadUsers([]);
    }
  }, [selectedSquad]);

  const handleCreateSquad = async () => {
    if (!newSquadName.trim()) return;

    setError(null);
    try {
      await addSquad(newSquadName.trim());
      setNewSquadName("");
      onSquadsChanged();
    } catch (err) {
      console.error("Failed to create squad:", err);
      setError(parseSquadErrorMessage(err));
    }
  };

  const handleDeleteSquad = (squad: Squad) => {
    setConfirmDeleteSquad(squad);
  };

  const executeDeleteSquad = async () => {
    if (!confirmDeleteSquad) return;

    const squad = confirmDeleteSquad;
    setConfirmDeleteSquad(null);
    setError(null);
    try {
      await removeSquad(squad.id);
      if (selectedSquad?.id === squad.id) {
        setSelectedSquad(null);
      }
      onSquadsChanged();
    } catch (err) {
      setError("Failed to delete squad");
      console.error(err);
    }
  };

  const handleStartEdit = (squad: Squad) => {
    setEditingSquad(squad);
    setEditedName(squad.name);
  };

  const handleCancelEdit = () => {
    setEditingSquad(null);
    setEditedName("");
  };

  const handleSaveEdit = async () => {
    if (!editingSquad || !editedName.trim()) return;
    if (editedName.trim() === editingSquad.name) {
      handleCancelEdit();
      return;
    }

    setError(null);
    try {
      const updatedSquad = await updateSquad(editingSquad.id, editedName.trim());
      if (selectedSquad?.id === editingSquad.id) {
        setSelectedSquad(updatedSquad);
      }
      handleCancelEdit();
      onSquadsChanged();
    } catch (err) {
      console.error("Failed to rename squad:", err);
      setError(parseSquadErrorMessage(err));
    }
  };

  const handleToggleSquad = (squad: Squad) => {
    if (selectedSquad?.id === squad.id) {
      setSelectedSquad(null);
    } else {
      setSelectedSquad(squad);
    }
  };

  if (!isOpen) return null;

  // Sort squads alphabetically for display
  const sortedSquads = [...squads].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
        />
        <div className="relative bg-theme-surface border border-theme-border w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-theme-border">
            <h2 className="text-lg font-semibold text-theme-text">
              Manage Squads
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
                disabled={!newSquadName.trim() || isMutating}
                className="px-4 py-2 bg-primary-500 text-white hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>

            {/* Squad list */}
            <div className="border border-theme-border">
              {squadsLoading ? (
                <div className="p-4 text-center text-theme-text-muted">
                  Loading squads...
                </div>
              ) : sortedSquads.length === 0 ? (
                <div className="p-4 text-center text-theme-text-muted">
                  No squads yet. Create one above.
                </div>
              ) : (
                <ul className="divide-y divide-theme-border">
                  {sortedSquads.map((squad) => (
                    <li key={squad.id} className="group">
                      {editingSquad?.id === squad.id ? (
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
                            onClick={() => handleToggleSquad(squad)}
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {selectedSquad?.id === squad.id ? (
                                <ChevronDown className="w-4 h-4 text-theme-text-muted flex-shrink-0" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-theme-text-muted flex-shrink-0" />
                              )}
                              <span className="text-theme-text truncate">{squad.name}</span>
                              {selectedSquad?.id === squad.id && !loadingUsers && (
                                <span className="text-xs text-theme-text-muted">
                                  ({squadUsers.length} {squadUsers.length === 1 ? "user" : "users"})
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartEdit(squad);
                                }}
                                disabled={isMutating}
                                className="p-1.5 text-theme-text-muted hover:text-primary-400 transition-colors disabled:opacity-50"
                                title="Rename squad"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSquad(squad);
                                }}
                                disabled={isMutating}
                                className="p-1.5 text-theme-text-muted hover:text-red-400 transition-colors disabled:opacity-50"
                                title="Delete squad"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Users list (expandable) */}
                          {selectedSquad?.id === squad.id && (
                            <div className="bg-theme-elevated border-t border-theme-border">
                              {loadingUsers ? (
                                <div className="p-3 text-center text-sm text-theme-text-muted">
                                  Loading users...
                                </div>
                              ) : squadUsers.length === 0 ? (
                                <div className="p-3 text-center text-sm text-theme-text-muted">
                                  No users in this squad
                                </div>
                              ) : (
                                <ul className="divide-y divide-theme-border">
                                  {squadUsers.map((user) => (
                                    <li key={user.id} className="flex items-center gap-3 p-3">
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
