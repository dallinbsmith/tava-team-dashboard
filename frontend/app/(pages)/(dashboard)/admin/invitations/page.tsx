import { redirect } from "next/navigation";
import {
  getCurrentUserServer,
  getInvitationsServer,
  getSquadsServer,
  getDepartmentsServer,
} from "@/lib/server-api";
import { InvitationsPageClient } from "./InvitationsPageClient";

export default async function InvitationsPage() {
  const currentUser = await getCurrentUserServer();

  // Server-side admin check - redirect non-admins
  if (currentUser.role !== "admin") {
    redirect("/");
  }

  // Fetch all data in parallel
  const [invitations, squads, departments] = await Promise.all([
    getInvitationsServer(),
    getSquadsServer(),
    getDepartmentsServer(),
  ]);

  return (
    <InvitationsPageClient
      initialInvitations={invitations}
      initialSquads={squads}
      initialDepartments={departments}
    />
  );
}
