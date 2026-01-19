"use client";

import { useState, useEffect } from "react";
import { X, Plus, Trash2, Pencil, Check } from "lucide-react";
import { Squad } from "@/shared/types";
import { getSquads, createSquad, deleteSquad } from "@/lib/api";
import { parseSquadErrorMessage } from "@/lib/errors";

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
  const [squads, setSquads] = useState<Squad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newSquadName, setNewSquadName] = useState("");
  const [creatingSquad, setCreatingSquad] = useState(false);
  const [deletingSquadId, setDeletingSquadId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSquads();
    }
  }, [isOpen]);

  const loadSquads = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSquads();
      setSquads(data);
    } catch (err) {
      setError("Failed to load squads");
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

  const handleDeleteSquad = async (squad: Squad) => {
    if (!confirm(`Are you sure you want to delete "${squad.name}"? This will remove all users from this squad.`)) {
      return;
    }

    setDeletingSquadId(squad.id);
    setError(null);
    try {
      await deleteSquad(squad.id);
      setSquads((prev) => prev.filter((s) => s.id !== squad.id));
      onSquadsChanged();
    } catch (err) {
      setError("Failed to delete squad");
      console.error(err);
    } finally {
      setDeletingSquadId(null);
    }
  };

  if (!isOpen) return null;

  return (
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
                {squads.map((squad) => (
                  <li
                    key={squad.id}
                    className="flex items-center justify-between p-3 hover:bg-theme-elevated transition-colors"
                  >
                    <span className="text-theme-text">{squad.name}</span>
                    <button
                      onClick={() => handleDeleteSquad(squad)}
                      disabled={deletingSquadId === squad.id}
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
  );
}
