"use client";

import { useState, useTransition } from "react";
import { Invitation, CreateInvitationRequest } from "./types";
import { createInvitationAction, revokeInvitationAction } from "./actions";
import { useOrganization } from "@/providers/OrganizationProvider";
import { parseSquadErrorMessage } from "@/lib/errors";
import ConfirmationModal from "@/shared/common/ConfirmationModal";
import { Squad } from "@/shared/types/user";
import {
  Mail,
  UserPlus,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Shield,
  Users,
  Building2,
  ChevronDown,
  X,
  Plus,
} from "lucide-react";

interface InvitationsPageClientProps {
  initialInvitations: Invitation[];
  initialSquads: Squad[];
  initialDepartments: string[];
}

export function InvitationsPageClient({
  initialInvitations,
  initialSquads,
  initialDepartments,
}: InvitationsPageClientProps) {
  // Use organization provider for mutations (addSquad), fall back to initial data for display
  const { squads: providerSquads, addSquad, departments: providerDepartments } = useOrganization();

  // Use provider data if available, otherwise use initial server data
  const squads = providerSquads?.length > 0 ? providerSquads : initialSquads;
  const departments = providerDepartments?.length > 0 ? providerDepartments : initialDepartments;

  const [invitations, setInvitations] = useState<Invitation[]>(initialInvitations);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [newInvitation, setNewInvitation] = useState<CreateInvitationRequest>({
    email: "",
    role: "supervisor",
    department: "",
    squad_ids: [],
  });
  const [createdInvitation, setCreatedInvitation] = useState<Invitation | null>(null);

  // Department selection state
  const [departmentDropdownOpen, setDepartmentDropdownOpen] = useState(false);

  // Squad selection state
  const [squadDropdownOpen, setSquadDropdownOpen] = useState(false);
  const [newSquadName, setNewSquadName] = useState("");
  const [creatingSquad, setCreatingSquad] = useState(false);

  // Revoke confirmation state
  const [confirmRevokeId, setConfirmRevokeId] = useState<number | null>(null);

  // Filter state - show only pending by default
  const [showOnlyPending, setShowOnlyPending] = useState(true);

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createInvitationAction(newInvitation);
      if (result.success) {
        setCreatedInvitation(result.data);
        setInvitations([result.data, ...invitations]);
        setNewInvitation({ email: "", role: "supervisor", department: "", squad_ids: [] });
      } else {
        setError(result.error);
      }
    });
  };

  const handleRevokeInvitation = (id: number) => {
    setConfirmRevokeId(id);
  };

  const executeRevokeInvitation = async () => {
    if (!confirmRevokeId) return;

    const id = confirmRevokeId;
    setConfirmRevokeId(null);

    startTransition(async () => {
      const result = await revokeInvitationAction(id);
      if (result.success) {
        setInvitations(
          invitations.map((inv) =>
            inv.id === id ? { ...inv, status: "revoked" as const } : inv
          )
        );
      } else {
        setError(result.error);
      }
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "accepted":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "expired":
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
      case "revoked":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-900/40 text-yellow-300 border-yellow-500/30";
      case "accepted":
        return "bg-green-900/40 text-green-300 border-green-500/30";
      case "expired":
        return "bg-gray-700/40 text-gray-400 border-gray-500/30";
      case "revoked":
        return "bg-red-900/40 text-red-300 border-red-500/30";
      default:
        return "bg-gray-700/40 text-gray-400 border-gray-500/30";
    }
  };

  // Squad selection helpers
  const toggleSquad = (squadId: number) => {
    const currentIds = newInvitation.squad_ids || [];
    const newIds = currentIds.includes(squadId)
      ? currentIds.filter((id) => id !== squadId)
      : [...currentIds, squadId];
    setNewInvitation({ ...newInvitation, squad_ids: newIds });
  };

  const removeSquad = (squadId: number) => {
    const newIds = (newInvitation.squad_ids || []).filter((id) => id !== squadId);
    setNewInvitation({ ...newInvitation, squad_ids: newIds });
  };

  const handleCreateSquad = async () => {
    if (!newSquadName.trim()) return;
    setCreatingSquad(true);
    try {
      const squad = await addSquad(newSquadName.trim());
      setNewInvitation({
        ...newInvitation,
        squad_ids: [...(newInvitation.squad_ids || []), squad.id],
      });
      setNewSquadName("");
      setError(null);
    } catch (e) {
      setError(parseSquadErrorMessage(e));
    } finally {
      setCreatingSquad(false);
    }
  };

  const getSelectedSquads = () => {
    return squads.filter((s) =>
      (newInvitation.squad_ids || []).includes(s.id)
    );
  };

  return (
    <>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-theme-text">Invitations</h1>
          <p className="text-theme-text-muted mt-1">
            Invite new supervisors and admins to join the platform
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 transition-colors"
        >
          <UserPlus className="w-5 h-5 mr-2" />
          Send Invitation
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-500/30 p-4 mb-6">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Invitations List */}
      <div className="bg-theme-surface border border-theme-border overflow-hidden">
        <div className="px-6 py-4 border-b border-theme-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-theme-text">
            {showOnlyPending ? "Pending Invitations" : "All Invitations"}
          </h2>
          <label className="flex items-center gap-2 text-sm text-theme-text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={!showOnlyPending}
              onChange={(e) => setShowOnlyPending(!e.target.checked)}
              className="rounded border-theme-border"
            />
            Show all
          </label>
        </div>

        {invitations.length === 0 ? (
          <div className="px-6 py-12 text-center text-theme-text-muted">
            <Mail className="w-12 h-12 mx-auto mb-4 text-theme-text-subtle" />
            <p>No invitations yet</p>
            <p className="text-sm mt-1">Send your first invitation to get started</p>
          </div>
        ) : invitations.filter((inv) => !showOnlyPending || inv.status === "pending").length === 0 ? (
          <div className="px-6 py-12 text-center text-theme-text-muted">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-theme-text-subtle" />
            <p>No pending invitations</p>
            <p className="text-sm mt-1">
              <button
                onClick={() => setShowOnlyPending(false)}
                className="text-primary-400 hover:text-primary-300"
              >
                Show all invitations
              </button>
              {" "}to see past invitations
            </p>
          </div>
        ) : (
          <div className="divide-y divide-theme-border">
            {invitations
              .filter((inv) => !showOnlyPending || inv.status === "pending")
              .map((invitation) => (
              <div key={invitation.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-theme-elevated flex items-center justify-center">
                    <Mail className="w-5 h-5 text-theme-text-muted" />
                  </div>
                  <div>
                    <p className="font-medium text-theme-text">{invitation.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium border ${invitation.role === "admin"
                          ? "bg-purple-900/40 text-purple-300 border-purple-500/30"
                          : "bg-blue-900/40 text-blue-300 border-blue-500/30"
                          }`}
                      >
                        {invitation.role === "admin" ? (
                          <Shield className="w-3 h-3" />
                        ) : (
                          <Users className="w-3 h-3" />
                        )}
                        {invitation.role}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium border ${getStatusColor(
                          invitation.status
                        )}`}
                      >
                        {getStatusIcon(invitation.status)}
                        {invitation.status}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-theme-text-muted">
                    {new Date(invitation.created_at).toLocaleDateString()}
                  </span>
                  {invitation.status === "pending" && (
                    <button
                      onClick={() => handleRevokeInvitation(invitation.id)}
                      className="px-3 py-1 text-sm text-red-400 hover:bg-red-900/30 transition-colors"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Invitation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-theme-surface shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-theme-border">
              <h3 className="text-lg font-semibold text-theme-text">Send Invitation</h3>
            </div>

            {createdInvitation ? (
              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="w-12 h-12 bg-green-900/40 flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-6 h-6 text-green-400" />
                  </div>
                  <h4 className="text-lg font-medium text-theme-text">Invitation Sent!</h4>
                  <p className="text-sm text-theme-text-muted mt-1">
                    An email has been sent to <span className="text-theme-text font-medium">{createdInvitation.email}</span> with instructions to join.
                  </p>
                </div>

                <p className="text-xs text-theme-text-muted text-center mb-4">
                  The invitation will expire in 7 days
                </p>

                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreatedInvitation(null);
                  }}
                  className="w-full px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateInvitation} className="p-6">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-theme-text mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={newInvitation.email}
                    onChange={(e) =>
                      setNewInvitation({ ...newInvitation, email: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-theme-border bg-theme-elevated text-theme-text focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Enter email address"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-theme-text mb-1">
                    Role
                  </label>
                  <select
                    value={newInvitation.role}
                    onChange={(e) =>
                      setNewInvitation({
                        ...newInvitation,
                        role: e.target.value as "admin" | "supervisor",
                      })
                    }
                    className="w-full px-3 py-2 border border-theme-border bg-theme-elevated text-theme-text focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="supervisor">Supervisor</option>
                    <option value="admin">Admin</option>
                  </select>
                  <p className="text-xs text-theme-text-muted mt-1">
                    {newInvitation.role === "admin"
                      ? "Admins can manage all users and send invitations"
                      : "Supervisors can manage their direct reports"}
                  </p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-theme-text mb-1">
                    Department
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setDepartmentDropdownOpen(!departmentDropdownOpen)}
                      className="w-full px-3 py-2 border border-theme-border bg-theme-elevated text-theme-text text-left flex items-center justify-between focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <span className={newInvitation.department ? "text-theme-text" : "text-theme-text-muted"}>
                        {newInvitation.department || "Select department..."}
                      </span>
                      <ChevronDown className={`w-4 h-4 ml-2 shrink-0 transition-transform ${departmentDropdownOpen ? "rotate-180" : ""}`} />
                    </button>

                    {departmentDropdownOpen && (
                      <div className="absolute z-10 w-full mt-1 bg-theme-surface border border-theme-border shadow-lg max-h-48 overflow-y-auto">
                        {/* Option to clear selection */}
                        <button
                          type="button"
                          onClick={() => {
                            setNewInvitation({ ...newInvitation, department: "" });
                            setDepartmentDropdownOpen(false);
                          }}
                          className="w-full px-3 py-2 text-left text-theme-text-muted hover:bg-theme-elevated"
                        >
                          No department
                        </button>
                        {departments.map((dept) => (
                          <button
                            key={dept}
                            type="button"
                            onClick={() => {
                              setNewInvitation({ ...newInvitation, department: dept });
                              setDepartmentDropdownOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-theme-elevated ${
                              newInvitation.department === dept ? "bg-primary-900/20" : ""
                            }`}
                          >
                            <Building2 className="w-4 h-4 text-theme-text-muted" />
                            <span className="text-theme-text">{dept}</span>
                          </button>
                        ))}
                        {departments.length === 0 && (
                          <div className="px-3 py-2 text-theme-text-muted text-sm">
                            No departments available
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-theme-text mb-1">
                    Squads
                  </label>

                  {/* Selected squads */}
                  {getSelectedSquads().length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {getSelectedSquads().map((squad) => (
                        <span
                          key={squad.id}
                          className="inline-flex items-center gap-1 px-2 py-1 text-sm bg-primary-900/40 text-primary-300 border border-primary-500/30"
                        >
                          <Users className="w-3 h-3" />
                          {squad.name}
                          <button
                            type="button"
                            onClick={() => removeSquad(squad.id)}
                            className="ml-1 hover:text-primary-100"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Squad dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setSquadDropdownOpen(!squadDropdownOpen)}
                      className="w-full px-3 py-2 border border-theme-border bg-theme-elevated text-theme-text text-left flex items-center justify-between focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <span className="text-theme-text-muted">
                        {getSelectedSquads().length === 0
                          ? "Select squads..."
                          : `${getSelectedSquads().length} squad${getSelectedSquads().length > 1 ? "s" : ""} selected`}
                      </span>
                      <ChevronDown className={`w-4 h-4 ml-2 shrink-0 transition-transform ${squadDropdownOpen ? "rotate-180" : ""}`} />
                    </button>

                    {squadDropdownOpen && (
                      <div className="absolute z-10 w-full mt-1 bg-theme-surface border border-theme-border shadow-lg max-h-48 overflow-y-auto">
                        {squads.map((squad) => (
                          <button
                            key={squad.id}
                            type="button"
                            onClick={() => toggleSquad(squad.id)}
                            className={`w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-theme-elevated ${(newInvitation.squad_ids || []).includes(squad.id)
                              ? "bg-primary-900/20"
                              : ""
                              }`}
                          >
                            <div
                              className={`w-4 h-4 border flex items-center justify-center ${(newInvitation.squad_ids || []).includes(squad.id)
                                ? "border-primary-500 bg-primary-500"
                                : "border-theme-border"
                                }`}
                            >
                              {(newInvitation.squad_ids || []).includes(squad.id) && (
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              )}
                            </div>
                            <span className="text-theme-text">{squad.name}</span>
                          </button>
                        ))}

                        {/* Create new squad */}
                        <div className="border-t border-theme-border p-2">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newSquadName}
                              onChange={(e) => setNewSquadName(e.target.value)}
                              placeholder="New squad name"
                              className="flex-1 px-2 py-1 text-sm border border-theme-border bg-theme-elevated text-theme-text"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleCreateSquad();
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={handleCreateSquad}
                              disabled={creatingSquad || !newSquadName.trim()}
                              className="px-2 py-1 bg-primary-600 text-white text-sm hover:bg-primary-700 disabled:opacity-50"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-theme-text-muted mt-1">
                    Assign the user to one or more squads (optional)
                  </p>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-900/30 border border-red-500/30">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setError(null);
                      setDepartmentDropdownOpen(false);
                      setSquadDropdownOpen(false);
                      setNewSquadName("");
                    }}
                    className="flex-1 px-4 py-2 border border-theme-border text-theme-text hover:bg-theme-elevated transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50"
                  >
                    {isPending ? "Sending..." : "Send Invitation"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!confirmRevokeId}
        onClose={() => setConfirmRevokeId(null)}
        onConfirm={executeRevokeInvitation}
        title="Revoke Invitation"
        message="Are you sure you want to revoke this invitation? The recipient will no longer be able to use it to join."
        confirmText="Revoke"
        variant="danger"
      />
    </>
  );
}
