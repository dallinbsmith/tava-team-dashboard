"use client";

import { useState } from "react";
import { OrgChartDraft } from "../types";
import { FileText, Plus, Trash2, Send } from "lucide-react";

export interface DraftManagerProps {
  drafts: OrgChartDraft[];
  currentDraft: OrgChartDraft | null;
  setCurrentDraft: (draft: OrgChartDraft | null) => void;
  onSelectDraft: (draft: OrgChartDraft | null) => void;
  onCreateDraft: (name: string) => void;
  onDeleteDraft: (id: number) => void;
  onPublish: (id: number) => void;
  isLoading: boolean;
}

export default function DraftManager({
  drafts,
  currentDraft,
  setCurrentDraft,
  onSelectDraft,
  onCreateDraft,
  onDeleteDraft,
  onPublish,
  isLoading,
}: DraftManagerProps) {
  const [newDraftName, setNewDraftName] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleCreate = () => {
    if (newDraftName.trim()) {
      onCreateDraft(newDraftName.trim());
      setNewDraftName("");
      setShowCreateForm(false);
    }
  };

  const activeDrafts = drafts.filter((d) => d.status === "draft");

  return (
    <div className="bg-theme-surface border border-theme-border h-full flex flex-col">
      <div className="p-4 border-b border-theme-border">
        <h2 className="font-semibold text-theme-text flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Drafts
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {activeDrafts.length === 0 && !showCreateForm ? (
          <p className="text-sm text-theme-text-muted text-center py-4">
            No drafts yet. Create one to start planning changes.
          </p>
        ) : (
          activeDrafts.map((draft) => (
            <div
              key={draft.id}
              className={`p-3 border cursor-pointer transition-all rounded ${currentDraft?.id === draft.id
                  ? "border-primary-500 bg-primary-900/30 ring-2 ring-primary-500/30"
                  : "border-theme-border hover:border-theme-text-muted"
                }`}
              onClick={() => onSelectDraft(draft)}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-theme-text">{draft.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteDraft(draft.id);
                  }}
                  className="p-1 text-theme-text-muted hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="text-xs text-theme-text-muted mt-1">
                {draft.changes?.length || 0} changes
              </div>
            </div>
          ))
        )}

        {showCreateForm && (
          <div className="p-3 border border-primary-500/30 bg-primary-900/20 rounded">
            <input
              type="text"
              value={newDraftName}
              onChange={(e) => setNewDraftName(e.target.value)}
              placeholder="Draft name..."
              className="w-full px-3 py-2 border border-theme-border rounded text-sm bg-theme-elevated text-theme-text focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") setShowCreateForm(false);
              }}
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleCreate}
                className="flex-1 px-3 py-1.5 bg-primary-600 text-white text-sm rounded hover:bg-primary-700"
              >
                Create
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-3 py-1.5 border border-theme-border text-theme-text text-sm rounded hover:bg-theme-elevated"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-theme-border space-y-2">
        {!showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-theme-border text-theme-text rounded hover:bg-theme-elevated"
          >
            <Plus className="w-4 h-4" />
            New Draft
          </button>
        )}
        {currentDraft && (
          <button
            onClick={() => setCurrentDraft(null)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 transition-all text-purple-300 ring-2 ring-purple-500/50 hover:bg-purple-900/20"
          >
            Exit Draft Mode
          </button>
        )}

        {currentDraft && currentDraft.changes && currentDraft.changes.length > 0 && (
          <button
            onClick={() => onPublish(currentDraft.id)}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 transition-all text-green-300 ring-2 ring-green-500/50 hover:bg-green-900/20"
          >
            <Send className="w-4 h-4" />
            Publish Changes
          </button>
        )}
      </div>
    </div>
  );
}
