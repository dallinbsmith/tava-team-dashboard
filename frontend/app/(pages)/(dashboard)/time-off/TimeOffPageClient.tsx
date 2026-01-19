"use client";

import { useState, useCallback } from "react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { TimeOffRequest, User } from "@/shared/types";
import {
  getMyTimeOffRequests,
  getPendingTimeOffRequests,
  cancelTimeOffRequest,
} from "@/lib/api";
import {
  TimeOffRequestForm,
  TimeOffRequestList,
  TimeOffReviewModal,
} from "@/app/(pages)/time-off";
import { Calendar, Plus, Clock, RefreshCw } from "lucide-react";

const timeOffStatuses = ["pending", "approved", "rejected", "cancelled"] as const;

interface TimeOffPageClientProps {
  initialMyRequests: TimeOffRequest[];
  initialPendingRequests: TimeOffRequest[];
  currentUser: User;
  isSupervisorOrAdmin: boolean;
}

export function TimeOffPageClient({
  initialMyRequests,
  initialPendingRequests,
  currentUser,
  isSupervisorOrAdmin,
}: TimeOffPageClientProps) {
  const [myRequests, setMyRequests] = useState(initialMyRequests);
  const [pendingRequests, setPendingRequests] = useState(initialPendingRequests);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [reviewRequest, setReviewRequest] = useState<TimeOffRequest | null>(null);

  // URL-synced filter status
  const [filterStatus, setFilterStatus] = useQueryState(
    "status",
    parseAsStringLiteral(timeOffStatuses)
  );

  const fetchData = useCallback(async () => {
    setRefreshing(true);
    setError(null);

    try {
      const requests = await getMyTimeOffRequests();
      setMyRequests(requests);

      if (isSupervisorOrAdmin) {
        const pending = await getPendingTimeOffRequests();
        setPendingRequests(pending);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load time off data");
    } finally {
      setRefreshing(false);
    }
  }, [isSupervisorOrAdmin]);

  const handleCancel = async (id: number) => {
    setCancellingId(id);
    try {
      await cancelTimeOffRequest(id);
      await fetchData();
    } catch (err) {
      console.error("Failed to cancel request:", err);
    } finally {
      setCancellingId(null);
    }
  };

  const handleReviewClick = (id: number) => {
    const request = pendingRequests.find((r) => r.id === id);
    if (request) {
      setReviewRequest(request);
    }
  };

  const handleReviewSuccess = () => {
    setReviewRequest(null);
    fetchData();
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-7 h-7 text-amber-400" />
            Time Off
          </h1>
          <p className="text-gray-400 mt-1">Request and manage your time off</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchData()}
            disabled={refreshing}
            className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Request Time Off
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {showForm && (
        <div className="mb-6">
          <TimeOffRequestForm
            onSuccess={() => {
              setShowForm(false);
              fetchData();
            }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {isSupervisorOrAdmin && pendingRequests.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-400" />
            Pending Approvals
            <span className="px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded-full">
              {pendingRequests.length}
            </span>
          </h2>
          <TimeOffRequestList
            requests={pendingRequests}
            loading={false}
            showUser
            onReview={handleReviewClick}
            emptyMessage="No pending requests"
          />
        </div>
      )}

      <div>
        <h2 className="text-lg font-medium text-white mb-4">My Requests</h2>
        <TimeOffRequestList
          requests={myRequests}
          loading={false}
          onCancel={handleCancel}
          cancellingId={cancellingId}
          filterStatus={filterStatus}
          onFilterChange={setFilterStatus}
          emptyMessage="You haven't made any time off requests yet"
        />
      </div>

      {reviewRequest && (
        <TimeOffReviewModal
          request={reviewRequest}
          onClose={() => setReviewRequest(null)}
          onSuccess={handleReviewSuccess}
        />
      )}
    </div>
  );
}
