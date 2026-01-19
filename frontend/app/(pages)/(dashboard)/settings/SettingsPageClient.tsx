"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { User } from "@/shared/types/user";
import { JiraSettings, JiraUserWithMapping } from "@/app/(pages)/jira/types";
import {
  disconnectJira,
  getJiraOAuthAuthorizeURL,
  getJiraUsers,
  autoMatchJiraUsers,
  updateUserJiraMapping,
} from "@/lib/api";
import ConfirmationModal from "@/shared/common/ConfirmationModal";
import Avatar from "@/shared/common/Avatar";
import {
  Settings,
  CheckCircle,
  ExternalLink,
  AlertCircle,
  Trash2,
  Link2,
  Users,
  RefreshCw,
  UserCheck,
  Search,
} from "lucide-react";

interface SettingsPageClientProps {
  initialJiraSettings: JiraSettings;
  initialJiraUsers: JiraUserWithMapping[];
  initialAllUsers: User[];
  currentUser: User;
  isAdmin: boolean;
}

export function SettingsPageClient({
  initialJiraSettings,
  initialJiraUsers,
  initialAllUsers,
  currentUser,
  isAdmin,
}: SettingsPageClientProps) {
  const searchParams = useSearchParams();

  const [jiraSettings, setJiraSettings] = useState(initialJiraSettings);
  const [jiraUsers, setJiraUsers] = useState(initialJiraUsers);
  const [allUsers] = useState(initialAllUsers);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [autoMatching, setAutoMatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);

  // Handle OAuth callback params
  useEffect(() => {
    const jiraConnected = searchParams.get("jira_connected");
    const jiraSite = searchParams.get("jira_site");
    const jiraError = searchParams.get("jira_error");
    const jiraErrorDescription = searchParams.get("jira_error_description");

    if (jiraConnected === "true") {
      setSuccess(`Successfully connected to Jira${jiraSite ? ` (${jiraSite})` : ""}!`);
      window.history.replaceState({}, "", "/settings");
    } else if (jiraError) {
      setError(jiraErrorDescription || `Jira connection failed: ${jiraError}`);
      window.history.replaceState({}, "", "/settings");
    }
  }, [searchParams]);

  const fetchJiraUsers = useCallback(async () => {
    if (!jiraSettings?.org_configured) return;

    setLoadingUsers(true);
    try {
      const users = await getJiraUsers();
      setJiraUsers(users);
    } catch (e) {
      console.error("Failed to fetch Jira users:", e);
    } finally {
      setLoadingUsers(false);
    }
  }, [jiraSettings?.org_configured]);

  const handleConnectJiraOAuth = async () => {
    setConnecting(true);
    setError(null);

    try {
      const response = await getJiraOAuthAuthorizeURL();
      window.location.href = response.authorization_url;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to initiate Jira connection");
      setConnecting(false);
    }
  };

  const handleDisconnectJira = async () => {
    setSaving(true);
    setError(null);

    try {
      await disconnectJira();

      setJiraSettings({
        ...jiraSettings!,
        org_configured: false,
        jira_site_url: undefined,
        jira_site_name: undefined,
        configured_by_id: undefined,
      });
      setJiraUsers([]);
      setSuccess("Jira disconnected successfully");
      setShowDisconnectModal(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to disconnect Jira");
    } finally {
      setSaving(false);
    }
  };

  const handleAutoMatch = async () => {
    setAutoMatching(true);
    setError(null);

    try {
      const result = await autoMatchJiraUsers();
      setSuccess(`Successfully matched ${result.matched} of ${result.total_jira_users} Jira users by email`);
      await fetchJiraUsers();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to auto-match users");
    } finally {
      setAutoMatching(false);
    }
  };

  const handleUpdateMapping = async (userId: number, jiraAccountId: string | null) => {
    try {
      await updateUserJiraMapping(userId, jiraAccountId);
      await fetchJiraUsers();
      setSuccess("Mapping updated");
      setTimeout(() => setSuccess(null), 2000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update mapping");
    }
  };

  const unmappedEmployees = allUsers.filter(emp =>
    !jiraUsers.some(ju => ju.mapped_user_id === emp.id)
  );

  const isConnected = jiraSettings?.org_configured;

  const filteredJiraUsers = jiraUsers.filter(u =>
    u.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-primary-900/40 flex items-center justify-center">
          <Settings className="w-6 h-6 text-primary-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-theme-text">Settings</h1>
          <p className="text-theme-text-muted">Manage your integrations and preferences</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-500/30 p-4 mb-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-red-400">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-900/30 border border-green-500/30 p-4 mb-6">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <p className="text-green-400">{success}</p>
          </div>
        </div>
      )}

      {/* Jira Integration Section */}
      <div className="bg-theme-surface border border-theme-border overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-theme-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none">
              <path
                d="M15.967 0C7.152 0 0 7.152 0 15.967c0 8.816 7.152 15.968 15.967 15.968 8.816 0 15.968-7.152 15.968-15.968C31.935 7.152 24.783 0 15.967 0z"
                fill="#2684FF"
              />
              <path
                d="M20.59 10.127H11.345c-.623 0-1.127.504-1.127 1.127v9.245c0 .623.504 1.127 1.127 1.127h9.245c.623 0 1.127-.504 1.127-1.127v-9.245c0-.623-.504-1.127-1.127-1.127z"
                fill="white"
              />
            </svg>
            <div>
              <h2 className="text-lg font-semibold text-theme-text">Jira Integration</h2>
              <p className="text-sm text-theme-text-muted">
                {isAdmin
                  ? "Connect your organization's Jira to view tasks for all employees"
                  : "Organization-wide Jira connection"}
              </p>
            </div>
          </div>
          {isConnected && (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-900/40 text-green-300">
              <CheckCircle className="w-3 h-3" />
              Connected
            </span>
          )}
        </div>

        <div className="p-6">
          {isConnected ? (
            <div className="space-y-4">
              <div className="bg-theme-elevated p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-theme-text-muted">Connected Site</p>
                    <p className="font-medium text-theme-text">
                      {jiraSettings?.jira_site_name || jiraSettings?.jira_site_url || "Jira Cloud"}
                    </p>
                  </div>
                  {jiraSettings?.jira_account_id && (
                    <div>
                      <p className="text-xs text-theme-text-muted">Your Jira Account Status</p>
                      <p className="font-medium text-green-400">Linked</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                {jiraSettings?.jira_site_url && (
                  <a
                    href={jiraSettings.jira_site_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-400 hover:bg-primary-900/30 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open Jira
                  </a>
                )}
                {isAdmin && (
                  <button
                    onClick={() => setShowDisconnectModal(true)}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-900/30 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Disconnect
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {isAdmin ? (
                <>
                  {jiraSettings?.oauth_enabled ? (
                    <div>
                      <div className="flex items-start gap-3 p-4 bg-blue-900/30 mb-4">
                        <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
                        <div>
                          <p className="text-sm text-blue-300">
                            Connect your organization&apos;s Jira account using OAuth. Once connected, all employees&apos;
                            Jira tasks will be visible on their dashboards (after matching their accounts).
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={handleConnectJiraOAuth}
                        disabled={connecting}
                        className="w-full px-4 py-3 bg-[#2684FF] text-white hover:bg-[#0065FF] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {connecting ? (
                          "Connecting..."
                        ) : (
                          <>
                            <Link2 className="w-5 h-5" />
                            Connect with Jira
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 p-4 bg-yellow-900/30">
                      <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-yellow-300">
                          Jira OAuth is not configured on the server. Please contact your system administrator
                          to set up the Jira OAuth integration.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-start gap-3 p-4 bg-theme-elevated">
                  <AlertCircle className="w-5 h-5 text-theme-text-muted mt-0.5" />
                  <div>
                    <p className="text-sm text-theme-text-muted">
                      Jira is not connected for your organization. Contact an administrator to set up the integration.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* User Mapping Section - Admin only, when connected */}
      {isAdmin && isConnected && (
        <div className="bg-theme-surface border border-theme-border overflow-hidden">
          <div className="px-6 py-4 border-b border-theme-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-theme-text-muted" />
              <div>
                <h2 className="text-lg font-semibold text-theme-text">Jira User Mapping</h2>
                <p className="text-sm text-theme-text-muted">
                  Match Jira users to employees to show their tasks
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAutoMatch}
                disabled={autoMatching}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary-400 hover:bg-primary-900/30 transition-colors disabled:opacity-50"
              >
                <UserCheck className="w-4 h-4" />
                {autoMatching ? "Matching..." : "Auto-match by email"}
              </button>
              <button
                onClick={fetchJiraUsers}
                disabled={loadingUsers}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-theme-text-muted hover:bg-theme-elevated transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loadingUsers ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Jira users..."
                className="w-full pl-10 pr-4 py-2 border border-theme-border bg-theme-elevated text-theme-text focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {loadingUsers ? (
              <div className="text-center py-8 text-theme-text-muted">Loading Jira users...</div>
            ) : jiraUsers.length === 0 ? (
              <div className="text-center py-8 text-theme-text-muted">
                No Jira users found. Make sure the organization is connected to Jira.
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredJiraUsers.map((jiraUser) => (
                  <div
                    key={jiraUser.account_id}
                    className="flex items-center justify-between p-3 bg-theme-elevated hover:bg-theme-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        jiraAvatarUrl={jiraUser.avatar_url}
                        firstName={jiraUser.display_name.split(" ")[0] || jiraUser.display_name}
                        lastName={jiraUser.display_name.split(" ").slice(1).join(" ") || ""}
                        size="sm"
                        className="rounded-full"
                      />
                      <div>
                        <p className="font-medium text-theme-text">{jiraUser.display_name}</p>
                        {jiraUser.email && (
                          <p className="text-xs text-theme-text-muted">{jiraUser.email}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {jiraUser.mapped_user ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-900/40 text-green-300">
                            <CheckCircle className="w-3 h-3" />
                            {jiraUser.mapped_user.first_name} {jiraUser.mapped_user.last_name}
                          </span>
                          <button
                            onClick={() => handleUpdateMapping(jiraUser.mapped_user_id!, null)}
                            className="text-xs text-red-400 hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <select
                          className="text-sm border border-theme-border py-1 px-2 bg-theme-elevated text-theme-text focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) {
                              handleUpdateMapping(parseInt(e.target.value), jiraUser.account_id);
                            }
                          }}
                        >
                          <option value="">Select employee...</option>
                          {unmappedEmployees.map((emp) => (
                            <option key={emp.id} value={emp.id}>
                              {emp.first_name} {emp.last_name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-theme-border">
              <p className="text-sm text-theme-text-muted">
                <strong>Tip:</strong> Use &quot;Auto-match by email&quot; to automatically link Jira users to employees
                with matching email addresses. Unmatched users can be manually mapped.
              </p>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={showDisconnectModal}
        onClose={() => setShowDisconnectModal(false)}
        onConfirm={handleDisconnectJira}
        title="Disconnect Jira"
        message="Are you sure you want to disconnect Jira for the entire organization? All employee task mappings will be cleared."
        confirmText="Disconnect"
        variant="danger"
        loading={saving}
        iconUrl="https://tava-team-calendar.s3.us-east-2.amazonaws.com/avatars/tava-logo.svg"
      />
    </div>
  );
}
