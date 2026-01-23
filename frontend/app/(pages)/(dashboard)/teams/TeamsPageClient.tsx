"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { parseAsStringLiteral, parseAsString, useQueryState } from "nuqs";
import { useCurrentUser } from "@/providers/CurrentUserProvider";
import { useOrganization } from "@/providers/OrganizationProvider";
import { SelectionType } from "./types";
import TeamSelector from "./components/TeamSelector";
import TeamTimeOffWidget from "./components/TeamTimeOffWidget";
import TeamTasksWidget from "./components/TeamTasksWidget";
import TeamMembersWidget from "./components/TeamMembersWidget";
import { FullPageSpinner } from "@/components";
import { ShieldAlert } from "lucide-react";

const selectionTypes = ["squad", "department"] as const;

export default function TeamsPageClient() {
  const router = useRouter();
  const { currentUser, loading: userLoading } = useCurrentUser();
  const { squads, departments, allUsers, loading: orgLoading } = useOrganization();

  // Check effective user's role (respects impersonation)
  const effectiveIsSupervisorOrAdmin =
    currentUser?.role === "supervisor" || currentUser?.role === "admin";

  // URL state for selection type and ID
  const [selectionType, setSelectionType] = useQueryState(
    "type",
    parseAsStringLiteral(selectionTypes).withDefault("squad")
  );
  const [selectedId, setSelectedId] = useQueryState("id", parseAsString.withDefault(""));

  // Set default selection when data is loaded
  useEffect(() => {
    if (!orgLoading && !selectedId) {
      if (selectionType === "squad" && squads?.length > 0) {
        setSelectedId(squads[0].id.toString());
      } else if (selectionType === "department" && departments?.length > 0) {
        setSelectedId(departments[0]);
      }
    }
  }, [orgLoading, selectedId, selectionType, squads, departments, setSelectedId]);

  const handleSelectionChange = (type: SelectionType, id: string) => {
    setSelectionType(type);
    setSelectedId(id);
  };

  // Loading state
  if (userLoading || orgLoading) {
    return <FullPageSpinner />;
  }

  // Permission check - only supervisors and admins can access
  if (!effectiveIsSupervisorOrAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-xl font-semibold text-theme-text mb-2">Access Denied</h1>
        <p className="text-theme-text-muted text-center max-w-md">
          You don&apos;t have permission to view this page. Only supervisors and administrators can
          access team management.
        </p>
        <button
          onClick={() => router.push("/")}
          className="mt-6 px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 transition-colors"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  // Get selected label for display
  const getSelectedLabel = () => {
    if (!selectedId) return "Select a team";
    if (selectionType === "squad") {
      const squad = squads.find((s) => s.id.toString() === selectedId);
      return squad?.name || "Unknown Squad";
    }
    return selectedId;
  };

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-theme-text">Teams</h1>
          <p className="text-theme-text-muted mt-1">View team time-off, tasks, and organization</p>
        </div>
        <TeamSelector
          squads={squads}
          departments={departments}
          selectedType={selectionType}
          selectedId={selectedId}
          onSelect={handleSelectionChange}
        />
      </div>

      {/* Content */}
      {!selectedId ? (
        <div className="text-center py-16 bg-theme-surface border border-theme-border">
          <p className="text-theme-text-muted">Select a team or department to view details</p>
        </div>
      ) : (
        <>
          {/* Top row: Time Off and Tasks */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <TeamTimeOffWidget
              selectionType={selectionType}
              selectedId={selectedId}
              allUsers={allUsers}
            />
            <TeamTasksWidget
              selectionType={selectionType}
              selectedId={selectedId}
              allUsers={allUsers}
            />
          </div>

          {/* Bottom row: Team Members */}
          <TeamMembersWidget
            selectionType={selectionType}
            selectedId={selectedId}
            allUsers={allUsers}
            selectedLabel={getSelectedLabel()}
          />
        </>
      )}
    </>
  );
}
