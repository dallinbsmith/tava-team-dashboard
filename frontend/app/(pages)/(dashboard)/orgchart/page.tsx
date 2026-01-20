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
  const canEdit = currentUser.role === "admin" || currentUser.role === "supervisor";

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
      canEdit={canEdit}
    />
  );
}
