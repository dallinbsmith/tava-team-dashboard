import { User } from "../../../shared/types/user";

export type TimeOffType = "vacation" | "sick" | "personal" | "bereavement" | "jury_duty" | "other";
export type TimeOffStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface TimeOffRequest {
  id: number;
  user_id: number;
  user?: User;
  start_date: string;
  end_date: string;
  request_type: TimeOffType;
  reason?: string;
  status: TimeOffStatus;
  reviewer_id?: number;
  reviewer?: User;
  reviewer_notes?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TimeOffImpact {
  has_time_off: boolean;
  time_off_days: number;
  remaining_days: number;
  impact_percent: number;
}

export interface CreateTimeOffRequest {
  start_date: string;
  end_date: string;
  request_type: TimeOffType;
  reason?: string;
  // For supervisor/admin to create time off for another user
  user_id?: number;
  auto_approve?: boolean;
}

export interface ReviewTimeOffRequest {
  status: "approved" | "rejected";
  reviewer_notes?: string;
}

export const TIME_OFF_TYPE_LABELS: Record<TimeOffType, string> = {
  vacation: "Vacation",
  sick: "Sick",
  personal: "Personal",
  bereavement: "Bereavement",
  jury_duty: "Jury Duty",
  other: "Other",
};

export const TIME_OFF_STATUS_LABELS: Record<TimeOffStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
};
