import {
  getCurrentUserServer,
  getMyTimeOffRequestsServer,
  getPendingTimeOffRequestsServer,
} from "@/lib/server-api";
import { TimeOffPageClient } from "./TimeOffPageClient";

export default async function TimeOffPage() {
  const currentUser = await getCurrentUserServer();
  const isSupervisorOrAdmin =
    currentUser.role === "admin" || currentUser.role === "supervisor";

  const [myRequests, pendingRequests] = await Promise.all([
    getMyTimeOffRequestsServer(),
    isSupervisorOrAdmin
      ? getPendingTimeOffRequestsServer()
      : Promise.resolve([]),
  ]);

  return (
    <TimeOffPageClient
      initialMyRequests={myRequests}
      initialPendingRequests={pendingRequests}
      isSupervisorOrAdmin={isSupervisorOrAdmin}
    />
  );
}
