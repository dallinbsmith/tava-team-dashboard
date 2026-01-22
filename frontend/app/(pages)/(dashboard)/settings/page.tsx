import {
  getCurrentUserServer,
  getJiraSettingsServer,
  getJiraUsersServer,
  getAllUsersServer,
} from "@/lib/server-api";
import { SettingsPageClient } from "./SettingsPageClient";

export default async function SettingsPage() {
  const [currentUser, jiraSettings] = await Promise.all([
    getCurrentUserServer(),
    getJiraSettingsServer(),
  ]);

  const isAdmin = currentUser.role === "admin";
  const isConnected = jiraSettings?.org_configured;

  // Only fetch Jira users if admin and connected
  const [jiraUsers, allUsers] = await Promise.all([
    isAdmin && isConnected ? getJiraUsersServer() : Promise.resolve([]),
    isAdmin && isConnected ? getAllUsersServer() : Promise.resolve([]),
  ]);

  return (
    <SettingsPageClient
      initialJiraSettings={jiraSettings}
      initialJiraUsers={jiraUsers}
      initialAllUsers={allUsers}
      isAdmin={isAdmin}
    />
  );
}
