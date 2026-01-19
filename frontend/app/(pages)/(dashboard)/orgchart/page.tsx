import {
  getCurrentUserServer,
  getOrgTreeServer,
  getOrgChartDraftsServer,
  getSquadsServer,
  getDepartmentsServer,
} from "@/lib/server-api";
import { OrgChartPageClient } from "./OrgChartPageClient";
import { OrgTreeNode } from "./types";

export default async function OrgChartPage() {
  const currentUser = await getCurrentUserServer();
  const isSupervisorOrAdmin = currentUser.role === "admin" || currentUser.role === "supervisor";

  if (!isSupervisorOrAdmin) {
    return (
      <div className="bg-amber-900/30 border border-amber-500/30 p-4 rounded">
        <p className="text-amber-400">
          Access denied. Only supervisors and admins can access the org chart.
        </p>
      </div>
    );
  }

  const [treeResult, drafts, squads, departments] = await Promise.all([
    getOrgTreeServer(),
    getOrgChartDraftsServer(),
    getSquadsServer(),
    getDepartmentsServer(),
  ]);

  // Handle both single tree (supervisor) and array of trees (admin)
  const orgTrees: OrgTreeNode[] = Array.isArray(treeResult) ? treeResult : [treeResult];

  return (
    <OrgChartPageClient
      initialOrgTrees={orgTrees}
      initialDrafts={drafts}
      initialSquads={squads}
      initialDepartments={departments}
      currentUser={currentUser}
      isSupervisorOrAdmin={isSupervisorOrAdmin}
    />
  );
}
