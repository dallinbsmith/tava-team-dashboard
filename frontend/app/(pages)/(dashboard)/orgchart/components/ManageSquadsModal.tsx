"use client";

import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { Squad } from "@/shared/types/user";
import { parseSquadErrorMessage } from "@/lib/errors";
import { useSquadsQuery } from "@/hooks";
import ConfirmationModal from "@/shared/common/ConfirmationModal";

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
  const { squads, isLoading: squadsLoading, addSquad, removeSquad, isMutating } = useSquadsQuery();

  const [error, setError] = useState<string | null>(null);
  const [newSquadName, setNewSquadName] = useState("");
  const [confirmDeleteSquad, setConfirmDeleteSquad] = useState<Squad | null>(null);

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
      onSquadsChanged();
    } catch (err) {
      setError("Failed to delete squad");
      console.error(err);
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
        <div className="relative bg-theme-surface border border-theme-border w-full max-w-md mx-4 max-h-[90vh] overflow-hidden flex flex-col">
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
                    <li
                      key={squad.id}
                      className="flex items-center justify-between p-3 hover:bg-theme-elevated transition-colors"
                    >
                      <span className="text-theme-text">{squad.name}</span>
                      <button
                        onClick={() => handleDeleteSquad(squad)}
                        disabled={isMutating}
                        className="p-1.5 text-theme-text-muted hover:text-red-400 transition-colors disabled:opacity-50"
                        title="Delete squad"
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
