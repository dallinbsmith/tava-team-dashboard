import {
  getOrgTreeServer,
  getOrgChartDraftsServer,
  getSquadsServer,
  getDepartmentsServer,
} from "@/lib/server-api";
import { OrgChartPageClient } from "./OrgChartPageClient";
import { OrgTreeNode } from "./types";
interface OrgChartContentProps {
  canEdit: boolean;
}

/**
 * Async server component that fetches org chart data.
 * Wrap this in Suspense to enable streaming.
 */
export const OrgChartContent = async ({ canEdit }: OrgChartContentProps) => {
  // Fetch all org chart data in parallel
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
      canEdit={canEdit}
    />
  );
};
