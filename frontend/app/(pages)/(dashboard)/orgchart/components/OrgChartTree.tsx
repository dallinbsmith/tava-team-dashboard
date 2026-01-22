"use client";

import { User, Squad } from "@/shared/types/user";
import { OrgTreeNode, DraftChange } from "../types";
import Avatar from "@/shared/common/Avatar";
import {
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  Shield,
  AlertCircle,
  Pencil,
} from "lucide-react";

// Helper function to apply draft changes to the org tree for preview
export function applyDraftChangesToTree(
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
      (node.user as unknown as { originalDepartment: string }).originalDepartment = node.user.department || "";
      node.user.department = change.new_department;
    }

    // Apply role change
    if (change.new_role !== undefined) {
      node.user.role = change.new_role;
    }

    // Apply squad changes - preserve original squads for comparison
    if (change.new_squad_ids !== undefined) {
      // Store original squads before overwriting
      (node.user as unknown as { originalSquads: Squad[] }).originalSquads = node.user.squads || [];
      node.user.squads = change.new_squad_ids
        .map((id) => squadMap.get(id))
        .filter((squad): squad is Squad => squad !== undefined);
    }
  }

  return clonedTrees;
}

// Draggable employee card
export function DraggableEmployeeCard({
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
export function DroppableSupervisorZone({
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
export function OrgTreeRenderer({
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
export function DragOverlayCard({ user }: { user: User }) {
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
        {user.squads && user.squads.length > 0 && (
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
