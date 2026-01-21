"use client";

import { useState, useCallback } from "react";
import {
  getOrgTree,
  getOrgChartDrafts,
  createOrgChartDraft,
  getOrgChartDraft,
  deleteOrgChartDraft,
  addDraftChange,
  removeDraftChange,
  publishDraft,
  getDepartments,
} from "@/lib/api";
import { useOrganization } from "@/providers/OrganizationProvider";
import ManageSquadsModal from "./components/ManageSquadsModal";
import ManageDepartmentsModal from "./components/ManageDepartmentsModal";
import DraftManager from "./components/DraftManager";
import { parseErrorMessage } from "@/lib/errors";
import { User, Squad } from "@/shared/types/user";
import { OrgTreeNode, OrgChartDraft, DraftChange } from "./types";
import Avatar from "@/shared/common/Avatar";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  DragStartEvent,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  Shield,
  Building2,
  ArrowRight,
  X,
  AlertCircle,
  UserCircle,
  Pencil,
  Eye,
  Users,
} from "lucide-react";

// Helper function to apply draft changes to the org tree for preview
function applyDraftChangesToTree(
  trees: OrgTreeNode[],
  changes: DraftChange[],
  squads: Squad[] = []
): OrgTreeNode[] {
  if (changes.length === 0) {
    return trees;
  }

  // Deep clone the trees
  const clonedTrees = JSON.parse(JSON.stringify(trees)) as OrgTreeNode[];

  // Build a map of user ID to their node for quick lookup
  const nodeMap = new Map<number, OrgTreeNode>();
  const parentMap = new Map<number, OrgTreeNode | null>();

  function buildMaps(node: OrgTreeNode, parent: OrgTreeNode | null) {
    nodeMap.set(node.user.id, node);
    parentMap.set(node.user.id, parent);
    node.children.forEach((child) => buildMaps(child, node));
  }

  clonedTrees.forEach((tree) => buildMaps(tree, null));

  // Build squad lookup map
  const squadMap = new Map<number, Squad>();
  squads.forEach((squad) => squadMap.set(squad.id, squad));

  // Apply each change
  for (const change of changes) {
    const userId = change.user_id;
    const node = nodeMap.get(userId);

    if (!node) continue;

    // Apply supervisor change
    if (change.new_supervisor_id !== undefined && change.new_supervisor_id !== change.original_supervisor_id) {
      const newSupervisor = change.new_supervisor_id ? nodeMap.get(change.new_supervisor_id) : null;

      // Remove from current parent
      const currentParent = parentMap.get(userId);
      if (currentParent) {
        currentParent.children = currentParent.children.filter(
          (child) => child.user.id !== userId
        );
      }

      // Add to new supervisor
      if (newSupervisor) {
        newSupervisor.children.push(node);
        parentMap.set(userId, newSupervisor);
      }
    }

    // Apply department change - preserve original for comparison
    if (change.new_department !== undefined) {
      (node.user as any).originalDepartment = node.user.department || "";
      node.user.department = change.new_department;
    }

    // Apply role change
    if (change.new_role !== undefined) {
      node.user.role = change.new_role;
    }

    // Apply squad changes - preserve original squads for comparison
    if (change.new_squad_ids !== undefined) {
      // Store original squads before overwriting
      (node.user as any).originalSquads = node.user.squads || [];
      node.user.squads = change.new_squad_ids
        .map((id) => squadMap.get(id))
        .filter((squad): squad is Squad => squad !== undefined);
    }
  }

  return clonedTrees;
}

// Draggable employee card
function DraggableEmployeeCard({
  node,
  pendingChange,
  isBeingDragged,
  isDraftMode,
  onEditClick,
}: {
  node: OrgTreeNode;
  pendingChange?: DraftChange;
  isBeingDragged: boolean;
  isDraftMode: boolean;
  onEditClick?: (user: User) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `employee-${node.user.id}`,
    data: { user: node.user },
    disabled: !isDraftMode,
  });

  const hasChange = !!pendingChange;

  const handleClick = (e: React.MouseEvent) => {
    // Only handle click if in draft mode and not dragging
    if (isDraftMode && !isDragging && onEditClick) {
      e.stopPropagation();
      onEditClick(node.user);
    }
  };

  return (
    <div
      ref={setNodeRef}
      onClick={handleClick}
      className={`flex items-center gap-3 p-3 bg-theme-surface border transition-all ${hasChange
        ? "border-purple-400 ring-2 ring-purple-500/30"
        : isDraftMode
          ? "border-theme-border hover:border-primary-400 hover:shadow-sm cursor-pointer"
          : "border-theme-border"
        } ${isDragging || isBeingDragged ? "opacity-50" : ""}`}
    >
      {/* Drag handle - only show in draft mode */}
      {isDraftMode &&
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-theme-text-muted hover:text-theme-text p-1 -m-1"
        >
          <GripVertical className="w-5 h-5" />
        </div>
      }

      {/* Avatar */}
      <Avatar
        s3AvatarUrl={node.user.avatar_url}
        firstName={node.user.first_name}
        lastName={node.user.last_name}
        size="md"
        className="rounded-full"
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-theme-text truncate">
            {node.user.first_name} {node.user.last_name}
          </span>
          {(node.user.role === "supervisor" || node.user.role === "admin") && (
            <Shield className="w-4 h-4 text-purple-500" />
          )}
        </div>
        <div className="text-sm text-theme-text-muted">
          <span>
            {node.user.title || node.user.role.charAt(0).toUpperCase() + node.user.role.slice(1)}
          </span>
          {node.user.department && (
            <>
              <span> - </span>
              <span>{node.user.department}</span>
            </>
          )}
        </div>
        {/* Squad display - simple list, detailed changes shown in Pending Changes panel */}
        {node.user.squads && node.user.squads.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {node.user.squads.map(squad => (
              <span
                key={squad.id}
                className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-theme-elevated text-theme-text-muted border border-theme-border rounded"
              >
                {squad.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Pending change indicator */}
      {hasChange && (
        <div className="flex items-center gap-1 text-xs bg-purple-900/40 text-purple-300 px-2 py-1 rounded">
          <AlertCircle className="w-3 h-3" />
          <span>Changed</span>
        </div>
      )}

      {/* Edit button - only show in draft mode */}
      {isDraftMode && (
        <div className="p-1.5 text-theme-text-muted hover:text-primary-400 hover:bg-primary-900/30 rounded transition-colors">
          <Pencil className="w-4 h-4" />
        </div>
      )}
    </div>
  );
}

// Droppable supervisor zone
function DroppableSupervisorZone({
  node,
  children,
  isExpanded,
  onToggleExpand,
  level,
  pendingChanges,
  draggedUserId,
  isDraftMode,
  onEditClick,
}: {
  node: OrgTreeNode;
  children: React.ReactNode;
  isExpanded: boolean;
  onToggleExpand: () => void;
  level: number;
  pendingChanges: Map<number, DraftChange>;
  draggedUserId: number | null;
  isDraftMode: boolean;
  onEditClick?: (user: User) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `supervisor-${node.user.id}`,
    data: { supervisor: node.user },
    disabled: !isDraftMode,
  });

  const hasChildren = node.children && node.children.length > 0;
  const canReceiveDrop = isDraftMode && draggedUserId !== null && draggedUserId !== node.user.id && (node.user.role === "supervisor" || node.user.role === "admin");

  return (
    <div className={`${level > 0 ? "ml-6 border-l-2 border-theme-border pl-4" : ""}`}>
      {/* Supervisor header with drop zone */}
      <div
        ref={setNodeRef}
        className={`rounded-lg transition-all ${isOver && canReceiveDrop
          ? "ring-2 ring-primary-500 ring-offset-2 bg-primary-900/30"
          : ""
          }`}
      >
        <div className="flex items-center gap-2 mb-2">
          {/* Expand/Collapse */}
          {hasChildren ? (
            <button
              onClick={onToggleExpand}
              className="p-1 hover:bg-theme-elevated rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-theme-text-muted" />
              ) : (
                <ChevronRight className="w-4 h-4 text-theme-text-muted" />
              )}
            </button>
          ) : (
            <div className="w-6" />
          )}

          {/* The supervisor's own card is also draggable */}
          <div className="flex-1">
            <DraggableEmployeeCard
              node={node}
              pendingChange={pendingChanges.get(node.user.id)}
              isBeingDragged={draggedUserId === node.user.id}
              isDraftMode={isDraftMode}
              onEditClick={onEditClick}
            />
          </div>
        </div>

        {/* Drop hint when dragging - only show in draft mode */}
        {canReceiveDrop && (
          <div
            className={`ml-6 p-2 border-2 border-dashed rounded text-center text-sm transition-all ${isOver
              ? "border-primary-500 bg-primary-900/30 text-primary-300"
              : "border-theme-border text-theme-text-muted"
              }`}
          >
            Drop here to move under {node.user.first_name}
          </div>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="mt-2 space-y-2">{children}</div>
      )}
    </div>
  );
}

// Recursive tree renderer
function OrgTreeRenderer({
  node,
  level,
  pendingChanges,
  expandedNodes,
  onToggleExpand,
  draggedUserId,
  isDraftMode,
  onEditClick,
}: {
  node: OrgTreeNode;
  level: number;
  pendingChanges: Map<number, DraftChange>;
  expandedNodes: Set<number>;
  onToggleExpand: (id: number) => void;
  draggedUserId: number | null;
  isDraftMode: boolean;
  onEditClick?: (user: User) => void;
}) {
  const isExpanded = expandedNodes.has(node.user.id);

  return (
    <DroppableSupervisorZone
      node={node}
      isExpanded={isExpanded}
      onToggleExpand={() => onToggleExpand(node.user.id)}
      level={level}
      pendingChanges={pendingChanges}
      draggedUserId={draggedUserId}
      isDraftMode={isDraftMode}
      onEditClick={onEditClick}
    >
      {node.children.map((child) => (
        <OrgTreeRenderer
          key={child.user.id}
          node={child}
          level={level + 1}
          pendingChanges={pendingChanges}
          expandedNodes={expandedNodes}
          onToggleExpand={onToggleExpand}
          draggedUserId={draggedUserId}
          isDraftMode={isDraftMode}
          onEditClick={onEditClick}
        />
      ))}
    </DroppableSupervisorZone>
  );
}

// Drag overlay - shows the card being dragged
function DragOverlayCard({ user }: { user: User }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-theme-surface border border-primary-400 shadow-xl rounded-lg opacity-90">
      <GripVertical className="w-5 h-5 text-theme-text-muted" />
      <Avatar
        s3AvatarUrl={user.avatar_url}
        firstName={user.first_name}
        lastName={user.last_name}
        size="md"
        className="rounded-full"
      />
      <div>
        <div className="font-medium text-theme-text">
          {user.first_name} {user.last_name}
        </div>
        <div className="text-sm text-theme-text-muted">{user.title || user.role.charAt(0).toUpperCase() + user.role.slice(1)}</div>
        {user.squads?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {user.squads.map(squad => (
              <span
                key={squad.id}
                className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-theme-elevated text-theme-text-muted border border-theme-border rounded"
              >
                {squad.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Edit employee modal for draft changes
function EditEmployeeModal({
  employee,
  squads,
  departments,
  isOpen,
  onClose,
  onSave,
}: {
  employee: User;
  squads: Squad[];
  departments: string[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (newDepartment: string, squadIds: number[], newRole?: "employee" | "supervisor") => void;
}) {
  const [department, setDepartment] = useState(employee.department || "");
  const [selectedSquadIds, setSelectedSquadIds] = useState<number[]>(
    employee.squads?.map(s => s.id) || []
  );
  const [role, setRole] = useState<"employee" | "supervisor">(
    employee.role === "admin" ? "supervisor" : employee.role
  );
  const [isCreatingDepartment, setIsCreatingDepartment] = useState(false);
  const [newDepartmentName, setNewDepartmentName] = useState("");

  const originalSquadIds = employee.squads?.map(s => s.id).sort() || [];
  const currentSquadIds = [...selectedSquadIds].sort();
  const squadsChanged =
    originalSquadIds.length !== currentSquadIds.length ||
    !originalSquadIds.every((id, i) => id === currentSquadIds[i]);

  const originalRole = employee.role === "admin" ? "supervisor" : employee.role;
  const roleChanged = role !== originalRole;

  const hasChanges =
    department !== (employee.department || "") || squadsChanged || roleChanged;

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
    setSelectedSquadIds(prev =>
      prev.includes(squadId)
        ? prev.filter(id => id !== squadId)
        : [...prev, squadId]
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
          <button
            onClick={onClose}
            className="p-1 text-theme-text-muted hover:text-theme-text"
          >
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
              <div className="text-sm text-theme-text-muted">
                {employee.title || employee.role}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Department Dropdown */}
            <div>
              <label className="block text-sm font-medium text-theme-text mb-1">
                Department
              </label>
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

            {/* Squads Multi-Select */}
            <div>
              <label className="block text-sm font-medium text-theme-text mb-1">
                Squads
              </label>
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

            {/* Role Selector */}
            <div>
              <label className="block text-sm font-medium text-theme-text mb-1">
                Role
              </label>
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

// Confirmation Modal for delete/publish actions
function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmLabel,
  confirmVariant = "danger",
  onConfirm,
  onCancel,
  isLoading,
}: {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmVariant?: "danger" | "success";
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}) {
  if (!isOpen) return null;

  const confirmButtonClass =
    confirmVariant === "danger"
      ? "bg-red-600 hover:bg-red-700 text-white"
      : "bg-green-600 hover:bg-green-700 text-white";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-theme-surface border border-theme-border rounded-lg w-full max-w-md mx-4 shadow-2xl">
        <div className="p-4 border-b border-theme-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-theme-text flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            {title}
          </h2>
          <button
            onClick={onCancel}
            className="p-1 text-theme-text-muted hover:text-theme-text"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <p className="text-theme-text-muted">{message}</p>
        </div>

        <div className="p-4 border-t border-theme-border flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 border border-theme-border text-theme-text rounded hover:bg-theme-elevated disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 rounded disabled:opacity-50 ${confirmButtonClass}`}
          >
            {isLoading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

interface OrgChartPageClientProps {
  initialOrgTrees: OrgTreeNode[];
  initialDrafts: OrgChartDraft[];
  initialSquads: Squad[];
  initialDepartments: string[];
  currentUser: User;
  canEdit: boolean;
}

export function OrgChartPageClient({
  initialOrgTrees,
  initialDrafts,
  initialSquads,
  initialDepartments,
  currentUser,
  canEdit,
}: OrgChartPageClientProps) {
  const { refetchSquads } = useOrganization();

  const [orgTrees, setOrgTrees] = useState<OrgTreeNode[]>(initialOrgTrees || []);
  const [drafts, setDrafts] = useState<OrgChartDraft[]>(initialDrafts || []);
  const [squads, setSquads] = useState<Squad[]>(initialSquads || []);
  const [currentDraft, setCurrentDraft] = useState<OrgChartDraft | null>(null);
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
    try {
      setActionLoading(true);
      const draft = await createOrgChartDraft({ name });
      setDrafts([draft, ...drafts]);
      setCurrentDraft(draft);
    } catch (e) {
      console.error("Failed to create draft:", e);
      setError(parseErrorMessage(e));
    } finally {
      setActionLoading(false);
    }
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

    try {
      setActionLoading(true);

      if (type === "delete") {
        await deleteOrgChartDraft(id);
        setDrafts(drafts.filter((d) => d.id !== id));
        if (currentDraft?.id === id) {
          setCurrentDraft(null);
        }
      } else if (type === "publish") {
        await publishDraft(id);
        // Refresh data
        const [treeResult, draftsList] = await Promise.all([
          getOrgTree(),
          getOrgChartDrafts(),
        ]);
        const trees = Array.isArray(treeResult) ? treeResult : [treeResult];
        setOrgTrees(trees);
        setDrafts(draftsList);
        setCurrentDraft(null);
      }

      setConfirmAction(null);
    } catch (e) {
      console.error(`Failed to ${type} draft:`, e);
      setError(parseErrorMessage(e));
    } finally {
      setActionLoading(false);
    }
  };

  // Add a change (move employee)
  const handleMoveEmployee = async (userId: number, newSupervisorId: number) => {
    if (!currentDraft) {
      alert("Please create or select a draft first to make changes.");
      return;
    }

    try {
      setActionLoading(true);
      await addDraftChange(currentDraft.id, {
        user_id: userId,
        new_supervisor_id: newSupervisorId,
      });
      const updatedDraft = await getOrgChartDraft(currentDraft.id);
      setCurrentDraft(updatedDraft);
    } catch (e) {
      console.error("Failed to add change:", e);
      setError(parseErrorMessage(e));
    } finally {
      setActionLoading(false);
    }
  };

  // Remove a change
  const handleRemoveChange = async (userId: number) => {
    if (!currentDraft) return;

    try {
      setActionLoading(true);
      await removeDraftChange(currentDraft.id, userId);
      const updatedDraft = await getOrgChartDraft(currentDraft.id);
      setCurrentDraft(updatedDraft);
    } catch (e) {
      console.error("Failed to remove change:", e);
    } finally {
      setActionLoading(false);
    }
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

    try {
      setActionLoading(true);
      await addDraftChange(currentDraft.id, {
        user_id: userId,
        new_department: newDepartment || undefined,
        new_squad_ids: squadIds,
        new_role: newRole,
      });
      const updatedDraft = await getOrgChartDraft(currentDraft.id);
      setCurrentDraft(updatedDraft);
      await refetchSquads();
      if (newDepartment && !availableDepartments.includes(newDepartment)) {
        setAvailableDepartments([...availableDepartments, newDepartment].sort());
      }
      setEditingEmployee(null);
    } catch (e) {
      console.error("Failed to add department/squad change:", e);
      setError(parseErrorMessage(e));
    } finally {
      setActionLoading(false);
    }
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
        <div className="mb-6">
          <div className="flex items-center justify-between">
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
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowManageDepartmentsModal(true)}
                  className="flex items-center gap-2 px-4 py-2 border border-theme-border text-theme-text rounded-full text-sm font-medium hover:bg-theme-elevated transition-all"
                >
                  <Building2 className="w-4 h-4" />
                  Manage Departments
                </button>
                <button
                  onClick={() => setShowManageSquadsModal(true)}
                  className="flex items-center gap-2 px-4 py-2 border border-theme-border text-theme-text rounded-full text-sm font-medium hover:bg-theme-elevated transition-all"
                >
                  <Users className="w-4 h-4" />
                  Manage Squads
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

        <div className="grid grid-cols-12 gap-6 h-[calc(100vh-220px)]">
          {/* Org Tree */}
          <div
            className={`${canEdit ? "col-span-8" : "col-span-12"} p-4 overflow-y-auto rounded transition-all ${isDraftMode
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
            <div className="col-span-4 overflow-y-auto">
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
          )}
        </div>
      </div>

      <DragOverlay>
        {activeUser ? <DragOverlayCard user={activeUser} /> : null}
      </DragOverlay>

      {editingEmployee && (
        <EditEmployeeModal
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
