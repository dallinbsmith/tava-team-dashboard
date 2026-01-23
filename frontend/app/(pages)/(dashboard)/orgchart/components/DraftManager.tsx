"use client";

import { useState, useEffect } from "react";
import { OrgChartDraft } from "../types";
import { User, Squad } from "@/shared/types/user";
import {
  FileText,
  Plus,
  Trash2,
  Send,
  X,
  AlertCircle,
  UserCircle,
  Building2,
  Shield,
  Users,
} from "lucide-react";

export interface DraftManagerProps {
  drafts: OrgChartDraft[];
  currentDraft: OrgChartDraft | null;
  setCurrentDraft: (draft: OrgChartDraft | null) => void;
  onSelectDraft: (draft: OrgChartDraft | null) => void;
  onCreateDraft: (name: string) => void;
  onDeleteDraft: (id: number) => void;
  onPublish: (id: number) => void;
  onRemoveChange: (userId: number) => void;
  isLoading: boolean;
  squads: Squad[];
  allUsers: User[];
}

type Tab = "drafts" | "changes";

// Helper component for showing before/after values
function ChangeRow({
  label,
  icon: Icon,
  oldValue,
  newValue,
  type = "text",
}: {
  label: string;
  icon: React.ElementType;
  oldValue?: string | null;
  newValue?: string | null;
  type?: "text" | "badge";
}) {
  const hasOld = oldValue && oldValue.length > 0;
  const hasNew = newValue && newValue.length > 0;

  if (!hasOld && !hasNew) return null;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-xs text-theme-text-muted">
        <Icon className="w-3 h-3" />
        <span>{label}</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 ml-4">
        {hasOld && (
          <span
            className={`${
              type === "badge"
                ? "px-2 py-0.5 text-xs bg-red-900/40 text-red-400 border border-red-500/30 rounded line-through"
                : "text-sm text-red-400 line-through"
            }`}
          >
            {oldValue}
          </span>
        )}
        {hasOld && hasNew && <span className="text-theme-text-muted">→</span>}
        {hasNew && (
          <span
            className={`${
              type === "badge"
                ? "px-2 py-0.5 text-xs bg-green-900/40 text-green-400 border border-green-500/30 rounded"
                : "text-sm text-green-400"
            }`}
          >
            {newValue}
          </span>
        )}
        {!hasOld && hasNew && <span className="text-xs text-theme-text-muted ml-1">(added)</span>}
      </div>
    </div>
  );
}

// Helper component for showing squad changes with multiple badges
function SquadChangeRow({
  originalSquadIds,
  newSquadIds,
  squads,
}: {
  originalSquadIds?: number[];
  newSquadIds?: number[];
  squads: Squad[];
}) {
  const squadMap = new Map(squads.map((s) => [s.id, s]));

  const originalIds = new Set(originalSquadIds || []);
  const newIds = new Set(newSquadIds || []);

  const removedSquads = (originalSquadIds || [])
    .filter((id) => !newIds.has(id))
    .map((id) => squadMap.get(id))
    .filter((s): s is Squad => s !== undefined);

  const addedSquads = (newSquadIds || [])
    .filter((id) => !originalIds.has(id))
    .map((id) => squadMap.get(id))
    .filter((s): s is Squad => s !== undefined);

  const unchangedSquads = (newSquadIds || [])
    .filter((id) => originalIds.has(id))
    .map((id) => squadMap.get(id))
    .filter((s): s is Squad => s !== undefined);

  if (removedSquads.length === 0 && addedSquads.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-xs text-theme-text-muted">
        <Users className="w-3 h-3" />
        <span>Squads</span>
      </div>
      <div className="flex flex-wrap gap-1.5 ml-4">
        {removedSquads.map((squad) => (
          <span
            key={`removed-${squad.id}`}
            className="px-2 py-0.5 text-xs bg-red-900/40 text-red-400 border border-red-500/30 rounded line-through"
          >
            {squad.name}
          </span>
        ))}
        {unchangedSquads.map((squad) => (
          <span
            key={squad.id}
            className="px-2 py-0.5 text-xs bg-theme-elevated text-theme-text-muted border border-theme-border rounded"
          >
            {squad.name}
          </span>
        ))}
        {addedSquads.map((squad) => (
          <span
            key={`added-${squad.id}`}
            className="px-2 py-0.5 text-xs bg-green-900/40 text-green-400 border border-green-500/30 rounded"
          >
            {squad.name}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function DraftManager({
  drafts,
  currentDraft,
  setCurrentDraft,
  onSelectDraft,
  onCreateDraft,
  onDeleteDraft,
  onPublish,
  onRemoveChange,
  isLoading,
  squads,
  allUsers,
}: DraftManagerProps) {
  const [newDraftName, setNewDraftName] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("drafts");

  const changes = currentDraft?.changes || [];
  const hasChanges = changes.length > 0;

  // Build user lookup map for supervisor names
  const userMap = new Map(allUsers.map((u) => [u.id, u]));

  const getSupervisorName = (id?: number | null): string | null => {
    if (!id) return null;
    const user = userMap.get(id);
    return user ? `${user.first_name} ${user.last_name}` : `User #${id}`;
  };

  // Auto-switch to changes tab when first change is made
  useEffect(() => {
    if (hasChanges && activeTab === "drafts") {
      setActiveTab("changes");
    }
  }, [hasChanges, activeTab]);

  // Switch back to drafts tab when no draft is selected
  useEffect(() => {
    if (!currentDraft && activeTab === "changes") {
      setActiveTab("drafts");
    }
  }, [currentDraft, activeTab]);

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
      {/* Tabs - only show Changes tab when a draft is selected */}
      <div className="flex border-b border-theme-border">
        <button
          onClick={() => setActiveTab("drafts")}
          className={`${currentDraft ? "flex-1" : "w-full"} px-4 py-3 text-sm font-medium transition-colors relative ${
            activeTab === "drafts"
              ? "text-theme-text bg-theme-elevated"
              : "text-theme-text-muted hover:text-theme-text hover:bg-theme-elevated/50"
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            <FileText className="w-4 h-4" />
            Drafts
          </span>
          {activeTab === "drafts" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
          )}
        </button>
        {currentDraft && (
          <button
            onClick={() => setActiveTab("changes")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
              activeTab === "changes"
                ? "text-theme-text bg-theme-elevated"
                : "text-theme-text-muted hover:text-theme-text hover:bg-theme-elevated/50"
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Changes
              {hasChanges && (
                <span
                  className={`flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-xs font-bold rounded-full ${
                    activeTab === "changes"
                      ? "bg-purple-500 text-white"
                      : "bg-purple-500 text-white animate-pulse"
                  }`}
                >
                  {changes.length}
                </span>
              )}
            </span>
            {activeTab === "changes" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
            )}
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "drafts" ? (
          /* Drafts Tab */
          <div className="space-y-3">
            {activeDrafts.length === 0 && !showCreateForm ? (
              <p className="text-sm text-theme-text-muted text-center py-4">
                No drafts yet. Create one to start planning changes.
              </p>
            ) : (
              activeDrafts.map((draft) => {
                // Use currentDraft's changes count if this is the selected draft (more up-to-date)
                const changesCount =
                  currentDraft?.id === draft.id
                    ? currentDraft.changes?.length || 0
                    : draft.changes?.length || 0;

                return (
                  <div
                    key={draft.id}
                    className={`p-3 border cursor-pointer transition-all rounded ${
                      currentDraft?.id === draft.id
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
                      {changesCount} change{changesCount !== 1 ? "s" : ""}
                    </div>
                  </div>
                );
              })
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
        ) : (
          /* Changes Tab */
          <div className="space-y-3">
            {!currentDraft ? (
              <p className="text-sm text-theme-text-muted text-center py-4">
                Select or create a draft to start making changes.
              </p>
            ) : !hasChanges ? (
              <p className="text-sm text-theme-text-muted text-center py-4">
                No changes yet. Drag employees to reorganize or click to edit.
              </p>
            ) : (
              changes.map((change) => {
                const hasSupervisorChange =
                  change.new_supervisor_id !== change.original_supervisor_id;
                const hasDepartmentChange =
                  change.new_department !== undefined &&
                  change.new_department !== change.original_department;
                const hasRoleChange =
                  change.new_role !== undefined && change.new_role !== change.original_role;
                const hasSquadChange = change.new_squad_ids !== undefined;

                return (
                  <div
                    key={change.id}
                    className="p-3 bg-purple-900/30 border border-purple-500/30 rounded"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-theme-text">
                        {change.user?.first_name} {change.user?.last_name}
                      </span>
                      <button
                        onClick={() => onRemoveChange(change.user_id)}
                        className="p-1 text-theme-text-muted hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      {hasSupervisorChange && (
                        <ChangeRow
                          label="Supervisor"
                          icon={UserCircle}
                          oldValue={getSupervisorName(change.original_supervisor_id) || "None"}
                          newValue={getSupervisorName(change.new_supervisor_id) || "None"}
                        />
                      )}

                      {hasDepartmentChange && (
                        <ChangeRow
                          label="Department"
                          icon={Building2}
                          oldValue={change.original_department || "None"}
                          newValue={change.new_department || "None"}
                          type="badge"
                        />
                      )}

                      {hasRoleChange && (
                        <ChangeRow
                          label="Role"
                          icon={Shield}
                          oldValue={
                            change.original_role
                              ? change.original_role.charAt(0).toUpperCase() +
                                change.original_role.slice(1)
                              : undefined
                          }
                          newValue={
                            change.new_role
                              ? change.new_role.charAt(0).toUpperCase() + change.new_role.slice(1)
                              : undefined
                          }
                          type="badge"
                        />
                      )}

                      {hasSquadChange && (
                        <SquadChangeRow
                          originalSquadIds={change.original_squad_ids}
                          newSquadIds={change.new_squad_ids}
                          squads={squads}
                        />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-theme-border space-y-2">
        {activeTab === "drafts" && !showCreateForm && (
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

        {currentDraft && hasChanges && (
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
