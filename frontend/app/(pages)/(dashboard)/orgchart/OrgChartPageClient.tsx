"use client";

import { useState, useTransition } from "react";
import {
  getOrgTree,
  getOrgChartDrafts,
  getOrgChartDraft,
  getDepartments,
} from "@/lib/api";
import {
  createDraftAction,
  deleteDraftAction,
  publishDraftAction,
  addDraftChangeAction,
  removeDraftChangeAction,
} from "./actions";
import { useOrganization } from "@/providers/OrganizationProvider";
import ManageSquadsModal from "./components/ManageSquadsModal";
import ManageDepartmentsModal from "./components/ManageDepartmentsModal";
import DraftManager from "./components/DraftManager";
import DraftEditModal from "./components/DraftEditModal";
import ConfirmationModal from "./components/ConfirmationModal";
import {
  OrgTreeRenderer,
  DragOverlayCard,
  applyDraftChangesToTree,
} from "./components/OrgChartTree";
import { User, Squad } from "@/shared/types/user";
import { OrgTreeNode, OrgChartDraft, DraftChange } from "./types";
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  Building2,
  UserCircle,
  Pencil,
  Eye,
  Users,
  PanelRightOpen,
  PanelRightClose,
} from "lucide-react";

interface OrgChartPageClientProps {
  initialOrgTrees: OrgTreeNode[];
  initialDrafts: OrgChartDraft[];
  initialSquads: Squad[];
  initialDepartments: string[];
  canEdit: boolean;
}

export function OrgChartPageClient({
  initialOrgTrees,
  initialDrafts,
  initialSquads,
  initialDepartments,
  canEdit,
}: OrgChartPageClientProps) {
  const { refetchSquads } = useOrganization();

  const [orgTrees, setOrgTrees] = useState<OrgTreeNode[]>(initialOrgTrees || []);
  const [drafts, setDrafts] = useState<OrgChartDraft[]>(initialDrafts || []);
  const [squads] = useState<Squad[]>(initialSquads || []);
  const [currentDraft, setCurrentDraft] = useState<OrgChartDraft | null>(null);
  const [, startTransition] = useTransition();
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<User | null>(null);
  const [availableDepartments, setAvailableDepartments] = useState<string[]>(initialDepartments || []);
  const [showManageDepartmentsModal, setShowManageDepartmentsModal] = useState(false);
  const [showManageSquadsModal, setShowManageSquadsModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: "delete" | "publish";
    id: number;
  } | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);

  // Auto-expand all nodes
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(() => {
    const allNodeIds = new Set<number>();
    const collectIds = (node: OrgTreeNode) => {
      allNodeIds.add(node.user.id);
      node.children.forEach(collectIds);
    };
    initialOrgTrees.forEach(collectIds);
    return allNodeIds;
  });

  // Configure sensors for drag detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Build pending changes map from current draft
  const pendingChanges = new Map<number, DraftChange>();
  if (currentDraft?.changes) {
    currentDraft.changes.forEach((change) => {
      pendingChanges.set(change.user_id, change);
    });
  }

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.user) {
      setActiveUser(active.data.current.user);
    }
  };

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveUser(null);

    if (!over) return;

    const draggedUser = active.data.current?.user as User | undefined;
    const targetSupervisor = over.data.current?.supervisor as User | undefined;

    if (!draggedUser || !targetSupervisor) return;
    if (draggedUser.id === targetSupervisor.id) return;

    await handleMoveEmployee(draggedUser.id, targetSupervisor.id);
  };

  // Create a new draft
  const handleCreateDraft = async (name: string) => {
    setActionLoading(true);
    startTransition(async () => {
      const result = await createDraftAction({ name });
      if (result.success) {
        setDrafts([result.data, ...drafts]);
        setCurrentDraft(result.data);
      } else {
        setError(result.error);
      }
      setActionLoading(false);
    });
  };

  // Select a draft
  const handleSelectDraft = async (draft: OrgChartDraft | null) => {
    if (!draft) {
      setCurrentDraft(null);
      return;
    }

    try {
      setActionLoading(true);
      const fullDraft = await getOrgChartDraft(draft.id);
      setCurrentDraft(fullDraft);
    } catch (e) {
      console.error("Failed to load draft:", e);
    } finally {
      setActionLoading(false);
    }
  };

  // Delete a draft - show confirmation modal
  const handleDeleteDraft = (id: number) => {
    setConfirmAction({ type: "delete", id });
  };

  // Publish a draft - show confirmation modal
  const handlePublish = (id: number) => {
    setConfirmAction({ type: "publish", id });
  };

  // Execute the confirmed action
  const handleConfirmAction = async () => {
    if (!confirmAction) return;

    const { type, id } = confirmAction;
    setActionLoading(true);

    startTransition(async () => {
      if (type === "delete") {
        const result = await deleteDraftAction(id);
        if (result.success) {
          setDrafts(drafts.filter((d) => d.id !== id));
          if (currentDraft?.id === id) {
            setCurrentDraft(null);
          }
          setConfirmAction(null);
        } else {
          setError(result.error);
        }
      } else if (type === "publish") {
        const result = await publishDraftAction(id);
        if (result.success) {
          // Refresh data after successful publish
          const [treeResult, draftsList] = await Promise.all([
            getOrgTree(),
            getOrgChartDrafts(),
          ]);
          const trees = Array.isArray(treeResult) ? treeResult : [treeResult];
          setOrgTrees(trees);
          setDrafts(draftsList);
          setCurrentDraft(null);
          setConfirmAction(null);
        } else {
          setError(result.error);
        }
      }
      setActionLoading(false);
    });
  };

  // Add a change (move employee)
  const handleMoveEmployee = async (userId: number, newSupervisorId: number) => {
    if (!currentDraft) {
      alert("Please create or select a draft first to make changes.");
      return;
    }

    setActionLoading(true);
    startTransition(async () => {
      const result = await addDraftChangeAction(currentDraft.id, {
        user_id: userId,
        new_supervisor_id: newSupervisorId,
      });
      if (result.success) {
        const updatedDraft = await getOrgChartDraft(currentDraft.id);
        setCurrentDraft(updatedDraft);
      } else {
        setError(result.error);
      }
      setActionLoading(false);
    });
  };

  // Remove a change
  const handleRemoveChange = async (userId: number) => {
    if (!currentDraft) return;

    setActionLoading(true);
    startTransition(async () => {
      const result = await removeDraftChangeAction(currentDraft.id, userId);
      if (result.success) {
        const updatedDraft = await getOrgChartDraft(currentDraft.id);
        setCurrentDraft(updatedDraft);
      } else {
        console.error("Failed to remove change:", result.error);
      }
      setActionLoading(false);
    });
  };

  // Handle department, squad, and role change
  const handleDepartmentAndSquadChange = async (
    userId: number,
    newDepartment: string,
    squadIds: number[],
    newRole?: "employee" | "supervisor"
  ) => {
    if (!currentDraft) {
      alert("Please create or select a draft first to make changes.");
      return;
    }

    setActionLoading(true);
    startTransition(async () => {
      const result = await addDraftChangeAction(currentDraft.id, {
        user_id: userId,
        new_department: newDepartment || undefined,
        new_squad_ids: squadIds,
        new_role: newRole,
      });
      if (result.success) {
        const updatedDraft = await getOrgChartDraft(currentDraft.id);
        setCurrentDraft(updatedDraft);
        await refetchSquads();
        if (newDepartment && !availableDepartments.includes(newDepartment)) {
          setAvailableDepartments([...availableDepartments, newDepartment].sort());
        }
        setEditingEmployee(null);
      } else {
        setError(result.error);
      }
      setActionLoading(false);
    });
  };

  // Toggle expand/collapse
  const toggleExpand = (userId: number) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  // Refresh departments list from API
  const refreshDepartments = async () => {
    try {
      const departments = await getDepartments();
      setAvailableDepartments(departments);
    } catch (e) {
      console.error("Failed to refresh departments:", e);
    }
  };

  if (error) {
    return (
      <div className="bg-red-900/30 border border-red-500/30 p-4 rounded">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  const isDraftMode = canEdit && currentDraft !== null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="h-full">
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h1 className="text-2xl font-bold text-theme-text">Organization Chart</h1>
              <p className="text-theme-text-muted mt-1">
                {!canEdit
                  ? "View the organization structure."
                  : isDraftMode
                    ? `Editing "${currentDraft.name}" - Drag employees to reassign them to different supervisors.`
                    : "Create or select a draft to start planning organizational changes."}
              </p>
            </div>
            {canEdit && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 mt-3 sm:mt-0">
                <button
                  onClick={() => setShowManageDepartmentsModal(true)}
                  className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 border border-theme-border text-theme-text rounded-full text-sm font-medium hover:bg-theme-elevated transition-all"
                >
                  <Building2 className="w-4 h-4" />
                  <span className="hidden xs:inline">Manage</span> Departments
                </button>
                <button
                  onClick={() => setShowManageSquadsModal(true)}
                  className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 border border-theme-border text-theme-text rounded-full text-sm font-medium hover:bg-theme-elevated transition-all"
                >
                  <Users className="w-4 h-4" />
                  <span className="hidden xs:inline">Manage</span> Squads
                </button>
              </div>
            )}
          </div>
        </div>
        {!isDraftMode && orgTrees.length > 0 && (
          <div className="my-4 p-3 bg-blue-900/30 border border-blue-500/30 text-sm text-blue-300 rounded flex items-center gap-2">
            <Eye className="w-4 h-4 flex-shrink-0" />
            <span>
              {canEdit ? (
                <><strong>View Only Mode:</strong> Create or select a draft from the sidebar to enable drag-and-drop editing.</>
              ) : (
                <><strong>View Only:</strong> You can view the organization structure but cannot make changes.</>
              )}
            </span>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 h-auto lg:h-[calc(100vh-220px)]">
          {/* Org Tree */}
          <div
            className={`flex-1 min-h-[400px] lg:min-h-0 p-3 sm:p-4 overflow-y-auto rounded transition-all ${isDraftMode
              ? "border-2 border-purple-500/50 ring-2 ring-purple-500/20"
              : "bg-theme-surface border border-theme-border"
              }`}
          >
            {isDraftMode && (
              <div className="mb-4 flex items-center gap-3 p-3 rounded-lg text-purple-300">
                <Pencil className="w-5 h-5 flex-shrink-0" />
                <div>
                  <span className="font-semibold">Draft Mode</span>
                  <span className="text-sm ml-2">
                    Drag employees to reorganize. Changes are saved to your draft.
                  </span>
                </div>
              </div>
            )}

            {orgTrees.length > 0 ? (
              <div className="space-y-4">
                {(isDraftMode && currentDraft?.changes?.length
                  ? applyDraftChangesToTree(orgTrees, currentDraft.changes, squads)
                  : orgTrees
                ).map((tree) => (
                  <OrgTreeRenderer
                    key={tree.user.id}
                    node={tree}
                    level={0}
                    pendingChanges={pendingChanges}
                    expandedNodes={expandedNodes}
                    onToggleExpand={toggleExpand}
                    draggedUserId={activeUser?.id || null}
                    isDraftMode={isDraftMode}
                    onEditClick={setEditingEmployee}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <UserCircle className="w-16 h-16 text-theme-text-subtle mx-auto mb-4" />
                <p className="text-theme-text-muted">No organization data available</p>
              </div>
            )}
          </div>

          {/* Sidebar - only show for users who can edit */}
          {canEdit && (
            <div className={`${showSidebar ? "w-full lg:w-96 xl:w-[420px]" : "w-0 overflow-hidden"} transition-all duration-300 flex-shrink-0`}>
              {/* Mobile sidebar toggle */}
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="lg:hidden mb-3 flex items-center gap-2 px-3 py-2 text-sm font-medium text-theme-text-muted hover:text-theme-text border border-theme-border rounded-lg hover:bg-theme-elevated transition-colors w-full justify-center"
              >
                {showSidebar ? (
                  <>
                    <PanelRightClose className="w-4 h-4" />
                    Hide Draft Panel
                  </>
                ) : (
                  <>
                    <PanelRightOpen className="w-4 h-4" />
                    Show Draft Panel
                  </>
                )}
              </button>
              <div className={`${showSidebar ? "block" : "hidden"} h-full overflow-y-auto`}>
                <DraftManager
                drafts={drafts}
                currentDraft={currentDraft}
                setCurrentDraft={setCurrentDraft}
                onSelectDraft={handleSelectDraft}
                onCreateDraft={handleCreateDraft}
                onDeleteDraft={handleDeleteDraft}
                onPublish={handlePublish}
                onRemoveChange={handleRemoveChange}
                isLoading={actionLoading}
                squads={squads}
                allUsers={(() => {
                  const users: User[] = [];
                  const collectUsers = (node: OrgTreeNode) => {
                    users.push(node.user);
                    node.children.forEach(collectUsers);
                  };
                  orgTrees.forEach(collectUsers);
                  return users;
                })()}
              />
              </div>
            </div>
          )}
        </div>
      </div>

      <DragOverlay>
        {activeUser ? <DragOverlayCard user={activeUser} /> : null}
      </DragOverlay>

      {editingEmployee && (
        <DraftEditModal
          employee={editingEmployee}
          squads={squads}
          departments={availableDepartments}
          isOpen={!!editingEmployee}
          onClose={() => setEditingEmployee(null)}
          onSave={(newDepartment, newSquadIds, newRole) => handleDepartmentAndSquadChange(editingEmployee.id, newDepartment, newSquadIds, newRole)}
        />
      )}

      <ManageDepartmentsModal
        isOpen={showManageDepartmentsModal}
        onClose={() => setShowManageDepartmentsModal(false)}
        onDepartmentsChanged={refreshDepartments}
      />

      <ManageSquadsModal
        isOpen={showManageSquadsModal}
        onClose={() => setShowManageSquadsModal(false)}
        onSquadsChanged={refetchSquads}
      />

      <ConfirmationModal
        isOpen={confirmAction !== null}
        title={confirmAction?.type === "delete" ? "Delete Draft" : "Publish Draft"}
        message={
          confirmAction?.type === "delete"
            ? "Are you sure you want to delete this draft? This action cannot be undone."
            : "Are you sure you want to publish this draft? All changes will be applied immediately."
        }
        confirmLabel={confirmAction?.type === "delete" ? "Delete" : "Publish"}
        confirmVariant={confirmAction?.type === "delete" ? "danger" : "success"}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmAction(null)}
        isLoading={actionLoading}
      />
    </DndContext>
  );
}
