/**
 * Tests for orgchart/components/OrgChartTree.tsx
 * OrgChartTree components including DraggableEmployeeCard, DroppableSupervisorZone, and responsive behavior
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import {
  DraggableEmployeeCard,
  DroppableSupervisorZone,
  OrgTreeRenderer,
  DragOverlayCard,
  applyDraftChangesToTree,
} from "../OrgChartTree";
import { User, Squad } from "@/shared/types/user";
import { OrgTreeNode, DraftChange } from "../../types";
import { DndContext } from "@dnd-kit/core";

// Mock Avatar component
jest.mock("@/shared/common/Avatar", () => {
  return function MockAvatar({
    firstName,
    lastName,
  }: {
    firstName: string;
    lastName: string;
    s3AvatarUrl?: string;
    size?: string;
    className?: string;
  }) {
    return (
      <div
        data-testid="avatar"
        data-firstname={firstName}
        data-lastname={lastName}
      >
        Avatar
      </div>
    );
  };
});

// Mock dnd-kit hooks
jest.mock("@dnd-kit/core", () => ({
  ...jest.requireActual("@dnd-kit/core"),
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    isDragging: false,
  }),
  useDroppable: () => ({
    isOver: false,
    setNodeRef: jest.fn(),
  }),
}));

describe("OrgChartTree", () => {
  const createMockUser = (overrides: Partial<User> = {}): User => ({
    id: 1,
    auth0_id: "auth0|123",
    email: "john@example.com",
    first_name: "John",
    last_name: "Doe",
    role: "employee",
    title: "Software Engineer",
    department: "Engineering",
    squads: [],
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  });

  const createMockNode = (
    user: User,
    children: OrgTreeNode[] = [],
  ): OrgTreeNode => ({
    user,
    children,
  });

  describe("DraggableEmployeeCard", () => {
    describe("rendering", () => {
      it("renders employee name", () => {
        const node = createMockNode(
          createMockUser({ first_name: "Jane", last_name: "Smith" }),
        );
        render(
          <DndContext>
            <DraggableEmployeeCard
              node={node}
              isBeingDragged={false}
              isDraftMode={false}
            />
          </DndContext>,
        );

        expect(screen.getByText("Jane Smith")).toBeInTheDocument();
      });

      it("renders employee title", () => {
        const node = createMockNode(
          createMockUser({ title: "Senior Developer" }),
        );
        render(
          <DndContext>
            <DraggableEmployeeCard
              node={node}
              isBeingDragged={false}
              isDraftMode={false}
            />
          </DndContext>,
        );

        expect(screen.getByText("Senior Developer")).toBeInTheDocument();
      });

      it("renders avatar", () => {
        const node = createMockNode(createMockUser());
        render(
          <DndContext>
            <DraggableEmployeeCard
              node={node}
              isBeingDragged={false}
              isDraftMode={false}
            />
          </DndContext>,
        );

        expect(screen.getByTestId("avatar")).toBeInTheDocument();
      });

      it("shows pending change indicator when there is a change", () => {
        const node = createMockNode(createMockUser());
        const pendingChange: DraftChange = {
          user_id: 1,
          new_department: "Product",
        };
        render(
          <DndContext>
            <DraggableEmployeeCard
              node={node}
              pendingChange={pendingChange}
              isBeingDragged={false}
              isDraftMode={true}
            />
          </DndContext>,
        );

        // On mobile, only the icon shows; on desktop, "Changed" text shows
        const changeIndicator = screen.getByText("Changed");
        expect(changeIndicator).toBeInTheDocument();
      });

      it("shows supervisor shield icon for supervisors", () => {
        const node = createMockNode(createMockUser({ role: "supervisor" }));
        const { container } = render(
          <DndContext>
            <DraggableEmployeeCard
              node={node}
              isBeingDragged={false}
              isDraftMode={false}
            />
          </DndContext>,
        );

        const shieldIcons = container.querySelectorAll("svg.lucide-shield");
        expect(shieldIcons.length).toBeGreaterThan(0);
      });

      it("shows admin shield icon for admins", () => {
        const node = createMockNode(createMockUser({ role: "admin" }));
        const { container } = render(
          <DndContext>
            <DraggableEmployeeCard
              node={node}
              isBeingDragged={false}
              isDraftMode={false}
            />
          </DndContext>,
        );

        const shieldIcons = container.querySelectorAll("svg.lucide-shield");
        expect(shieldIcons.length).toBeGreaterThan(0);
      });
    });

    describe("responsive styling", () => {
      it("has responsive gap classes", () => {
        const node = createMockNode(createMockUser());
        const { container } = render(
          <DndContext>
            <DraggableEmployeeCard
              node={node}
              isBeingDragged={false}
              isDraftMode={false}
            />
          </DndContext>,
        );

        const card = container.firstChild as HTMLElement;
        expect(card).toHaveClass("gap-2", "sm:gap-3");
      });

      it("has responsive padding classes", () => {
        const node = createMockNode(createMockUser());
        const { container } = render(
          <DndContext>
            <DraggableEmployeeCard
              node={node}
              isBeingDragged={false}
              isDraftMode={false}
            />
          </DndContext>,
        );

        const card = container.firstChild as HTMLElement;
        expect(card).toHaveClass("p-2", "sm:p-3");
      });

      it("has rounded-lg class for border radius", () => {
        const node = createMockNode(createMockUser());
        const { container } = render(
          <DndContext>
            <DraggableEmployeeCard
              node={node}
              isBeingDragged={false}
              isDraftMode={false}
            />
          </DndContext>,
        );

        const card = container.firstChild as HTMLElement;
        expect(card).toHaveClass("rounded-lg");
      });

      it("has responsive text classes on name", () => {
        const node = createMockNode(createMockUser());
        render(
          <DndContext>
            <DraggableEmployeeCard
              node={node}
              isBeingDragged={false}
              isDraftMode={false}
            />
          </DndContext>,
        );

        const name = screen.getByText("John Doe");
        expect(name).toHaveClass("text-sm", "sm:text-base");
      });

      it("has responsive text classes on title", () => {
        const node = createMockNode(createMockUser({ title: "Engineer" }));
        render(
          <DndContext>
            <DraggableEmployeeCard
              node={node}
              isBeingDragged={false}
              isDraftMode={false}
            />
          </DndContext>,
        );

        const title = screen.getByText("Engineer");
        expect(title.parentElement).toHaveClass("text-xs", "sm:text-sm");
      });

      it("hides squads on mobile", () => {
        const node = createMockNode(
          createMockUser({
            squads: [{ id: 1, name: "Frontend Team" }],
          }),
        );
        render(
          <DndContext>
            <DraggableEmployeeCard
              node={node}
              isBeingDragged={false}
              isDraftMode={false}
            />
          </DndContext>,
        );

        const squadBadge = screen.getByText("Frontend Team");
        expect(squadBadge.parentElement).toHaveClass("hidden", "sm:flex");
      });
    });

    describe("draft mode", () => {
      it("shows drag handle in draft mode", () => {
        const node = createMockNode(createMockUser());
        const { container } = render(
          <DndContext>
            <DraggableEmployeeCard
              node={node}
              isBeingDragged={false}
              isDraftMode={true}
            />
          </DndContext>,
        );

        const gripIcon = container.querySelector("svg.lucide-grip-vertical");
        expect(gripIcon).toBeInTheDocument();
      });

      it("hides drag handle when not in draft mode", () => {
        const node = createMockNode(createMockUser());
        const { container } = render(
          <DndContext>
            <DraggableEmployeeCard
              node={node}
              isBeingDragged={false}
              isDraftMode={false}
            />
          </DndContext>,
        );

        const gripIcon = container.querySelector("svg.lucide-grip-vertical");
        expect(gripIcon).not.toBeInTheDocument();
      });

      it("shows edit button in draft mode", () => {
        const node = createMockNode(createMockUser());
        const { container } = render(
          <DndContext>
            <DraggableEmployeeCard
              node={node}
              isBeingDragged={false}
              isDraftMode={true}
            />
          </DndContext>,
        );

        const pencilIcon = container.querySelector("svg.lucide-pencil");
        expect(pencilIcon).toBeInTheDocument();
      });

      it("applies hover styles in draft mode", () => {
        const node = createMockNode(createMockUser());
        const { container } = render(
          <DndContext>
            <DraggableEmployeeCard
              node={node}
              isBeingDragged={false}
              isDraftMode={true}
            />
          </DndContext>,
        );

        const card = container.firstChild as HTMLElement;
        expect(card).toHaveClass("cursor-pointer");
      });
    });

    describe("dragging state", () => {
      it("applies opacity when being dragged", () => {
        const node = createMockNode(createMockUser());
        const { container } = render(
          <DndContext>
            <DraggableEmployeeCard
              node={node}
              isBeingDragged={true}
              isDraftMode={true}
            />
          </DndContext>,
        );

        const card = container.firstChild as HTMLElement;
        expect(card).toHaveClass("opacity-50");
      });
    });
  });

  describe("DroppableSupervisorZone", () => {
    describe("responsive styling", () => {
      it("has responsive indentation classes for nested levels", () => {
        const node = createMockNode(createMockUser({ role: "supervisor" }));
        const { container } = render(
          <DndContext>
            <DroppableSupervisorZone
              node={node}
              isExpanded={true}
              onToggleExpand={jest.fn()}
              level={1}
              pendingChanges={new Map()}
              draggedUserId={null}
              isDraftMode={false}
            >
              <div>Children</div>
            </DroppableSupervisorZone>
          </DndContext>,
        );

        const wrapper = container.firstChild as HTMLElement;
        expect(wrapper).toHaveClass("ml-3", "sm:ml-6", "pl-2", "sm:pl-4");
      });

      it("has no indentation at root level", () => {
        const node = createMockNode(createMockUser({ role: "supervisor" }));
        const { container } = render(
          <DndContext>
            <DroppableSupervisorZone
              node={node}
              isExpanded={true}
              onToggleExpand={jest.fn()}
              level={0}
              pendingChanges={new Map()}
              draggedUserId={null}
              isDraftMode={false}
            >
              <div>Children</div>
            </DroppableSupervisorZone>
          </DndContext>,
        );

        const wrapper = container.firstChild as HTMLElement;
        expect(wrapper).not.toHaveClass("ml-3", "ml-6");
      });
    });

    describe("expand/collapse", () => {
      it("shows expand icon when collapsed with children", () => {
        const childNode = createMockNode(createMockUser({ id: 2 }));
        const node = createMockNode(createMockUser({ role: "supervisor" }), [
          childNode,
        ]);
        const { container } = render(
          <DndContext>
            <DroppableSupervisorZone
              node={node}
              isExpanded={false}
              onToggleExpand={jest.fn()}
              level={0}
              pendingChanges={new Map()}
              draggedUserId={null}
              isDraftMode={false}
            >
              <div>Children</div>
            </DroppableSupervisorZone>
          </DndContext>,
        );

        const chevronRight = container.querySelector(
          "svg.lucide-chevron-right",
        );
        expect(chevronRight).toBeInTheDocument();
      });

      it("shows collapse icon when expanded with children", () => {
        const childNode = createMockNode(createMockUser({ id: 2 }));
        const node = createMockNode(createMockUser({ role: "supervisor" }), [
          childNode,
        ]);
        const { container } = render(
          <DndContext>
            <DroppableSupervisorZone
              node={node}
              isExpanded={true}
              onToggleExpand={jest.fn()}
              level={0}
              pendingChanges={new Map()}
              draggedUserId={null}
              isDraftMode={false}
            >
              <div>Children</div>
            </DroppableSupervisorZone>
          </DndContext>,
        );

        const chevronDown = container.querySelector("svg.lucide-chevron-down");
        expect(chevronDown).toBeInTheDocument();
      });
    });
  });

  describe("DragOverlayCard", () => {
    describe("rendering", () => {
      it("renders user name", () => {
        const user = createMockUser({ first_name: "Jane", last_name: "Smith" });
        render(<DragOverlayCard user={user} />);

        expect(screen.getByText("Jane Smith")).toBeInTheDocument();
      });

      it("renders user title", () => {
        const user = createMockUser({ title: "Senior Developer" });
        render(<DragOverlayCard user={user} />);

        expect(screen.getByText("Senior Developer")).toBeInTheDocument();
      });

      it("renders avatar", () => {
        const user = createMockUser();
        render(<DragOverlayCard user={user} />);

        expect(screen.getByTestId("avatar")).toBeInTheDocument();
      });
    });

    describe("responsive styling", () => {
      it("has responsive max-width classes", () => {
        const user = createMockUser();
        const { container } = render(<DragOverlayCard user={user} />);

        const card = container.firstChild as HTMLElement;
        expect(card).toHaveClass("max-w-xs", "sm:max-w-sm");
      });

      it("has responsive gap classes", () => {
        const user = createMockUser();
        const { container } = render(<DragOverlayCard user={user} />);

        const card = container.firstChild as HTMLElement;
        expect(card).toHaveClass("gap-2", "sm:gap-3");
      });

      it("has responsive padding classes", () => {
        const user = createMockUser();
        const { container } = render(<DragOverlayCard user={user} />);

        const card = container.firstChild as HTMLElement;
        expect(card).toHaveClass("p-2", "sm:p-3");
      });

      it("has responsive text size on name", () => {
        const user = createMockUser();
        render(<DragOverlayCard user={user} />);

        const name = screen.getByText("John Doe");
        expect(name).toHaveClass("text-sm", "sm:text-base");
      });
    });
  });

  describe("applyDraftChangesToTree", () => {
    it("returns original trees when no changes", () => {
      const user = createMockUser();
      const trees = [createMockNode(user)];

      const result = applyDraftChangesToTree(trees, []);

      expect(result).toBe(trees);
    });

    it("applies department change", () => {
      const user = createMockUser({ department: "Engineering" });
      const trees = [createMockNode(user)];
      const changes: DraftChange[] = [
        { user_id: 1, new_department: "Product" },
      ];

      const result = applyDraftChangesToTree(trees, changes);

      expect(result[0].user.department).toBe("Product");
    });

    it("applies role change", () => {
      const user = createMockUser({ role: "employee" });
      const trees = [createMockNode(user)];
      const changes: DraftChange[] = [{ user_id: 1, new_role: "supervisor" }];

      const result = applyDraftChangesToTree(trees, changes);

      expect(result[0].user.role).toBe("supervisor");
    });

    it("applies squad changes", () => {
      const user = createMockUser({ squads: [] });
      const trees = [createMockNode(user)];
      const squads: Squad[] = [
        { id: 1, name: "Frontend Team" },
        { id: 2, name: "Backend Team" },
      ];
      const changes: DraftChange[] = [{ user_id: 1, new_squad_ids: [1, 2] }];

      const result = applyDraftChangesToTree(trees, changes, squads);

      expect(result[0].user.squads).toHaveLength(2);
      expect(result[0].user.squads![0].name).toBe("Frontend Team");
    });

    it("moves employee to new supervisor", () => {
      const supervisor = createMockUser({ id: 1, role: "supervisor" });
      const employee = createMockUser({ id: 2, role: "employee" });
      const newSupervisor = createMockUser({ id: 3, role: "supervisor" });

      const trees = [
        createMockNode(supervisor, [createMockNode(employee)]),
        createMockNode(newSupervisor),
      ];

      const changes: DraftChange[] = [
        {
          user_id: 2,
          original_supervisor_id: 1,
          new_supervisor_id: 3,
        },
      ];

      const result = applyDraftChangesToTree(trees, changes);

      // Employee should be removed from first supervisor
      expect(result[0].children).toHaveLength(0);
      // Employee should be added to new supervisor
      expect(result[1].children).toHaveLength(1);
      expect(result[1].children[0].user.id).toBe(2);
    });

    it("removes root-level node when moved to a supervisor", () => {
      const rootEmployee = createMockUser({ id: 1, role: "employee" });
      const supervisor = createMockUser({ id: 2, role: "supervisor" });

      const trees = [createMockNode(rootEmployee), createMockNode(supervisor)];

      const changes: DraftChange[] = [
        {
          user_id: 1,
          original_supervisor_id: undefined,
          new_supervisor_id: 2,
        },
      ];

      const result = applyDraftChangesToTree(trees, changes);

      // Root employee should be removed from root
      expect(result).toHaveLength(1);
      expect(result[0].user.id).toBe(2);
      // And added as child of supervisor
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children[0].user.id).toBe(1);
    });

    it("does not modify original trees", () => {
      const user = createMockUser({ department: "Engineering" });
      const trees = [createMockNode(user)];
      const changes: DraftChange[] = [
        { user_id: 1, new_department: "Product" },
      ];

      applyDraftChangesToTree(trees, changes);

      // Original should be unchanged
      expect(trees[0].user.department).toBe("Engineering");
    });
  });

  describe("OrgTreeRenderer", () => {
    it("renders node with employee card", () => {
      const node = createMockNode(createMockUser());
      render(
        <DndContext>
          <OrgTreeRenderer
            node={node}
            level={0}
            pendingChanges={new Map()}
            expandedNodes={new Set([1])}
            onToggleExpand={jest.fn()}
            draggedUserId={null}
            isDraftMode={false}
          />
        </DndContext>,
      );

      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    it("renders children when expanded", () => {
      const childNode = createMockNode(
        createMockUser({ id: 2, first_name: "Jane" }),
      );
      const node = createMockNode(
        createMockUser({ id: 1, role: "supervisor" }),
        [childNode],
      );

      render(
        <DndContext>
          <OrgTreeRenderer
            node={node}
            level={0}
            pendingChanges={new Map()}
            expandedNodes={new Set([1])}
            onToggleExpand={jest.fn()}
            draggedUserId={null}
            isDraftMode={false}
          />
        </DndContext>,
      );

      expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    });

    it("does not render children when collapsed", () => {
      const childNode = createMockNode(
        createMockUser({ id: 2, first_name: "Jane" }),
      );
      const node = createMockNode(
        createMockUser({ id: 1, role: "supervisor" }),
        [childNode],
      );

      render(
        <DndContext>
          <OrgTreeRenderer
            node={node}
            level={0}
            pendingChanges={new Map()}
            expandedNodes={new Set()} // Empty = collapsed
            onToggleExpand={jest.fn()}
            draggedUserId={null}
            isDraftMode={false}
          />
        </DndContext>,
      );

      expect(screen.queryByText("Jane Doe")).not.toBeInTheDocument();
    });
  });
});
