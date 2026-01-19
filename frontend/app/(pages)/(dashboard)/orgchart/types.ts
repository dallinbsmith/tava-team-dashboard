import { Role, User } from "@/shared/types/user";

export type DraftStatus = "draft" | "published" | "archived";

export interface OrgChartDraft {
  id: number;
  name: string;
  description?: string;
  created_by_id: number;
  created_by?: User;
  status: DraftStatus;
  published_at?: string;
  created_at: string;
  updated_at: string;
  changes?: DraftChange[];
}

export interface DraftChange {
  id: number;
  draft_id: number;
  user_id: number;
  user?: User;
  original_supervisor_id?: number;
  original_department?: string;
  original_role?: Role;
  original_squad_ids?: number[];
  new_supervisor_id?: number;
  new_department?: string;
  new_role?: Role;
  new_squad_ids?: number[];
  created_at: string;
  updated_at: string;
}

export interface CreateDraftRequest {
  name: string;
  description?: string;
}

export interface UpdateDraftRequest {
  name?: string;
  description?: string;
}

export interface AddDraftChangeRequest {
  user_id: number;
  new_supervisor_id?: number;
  new_department?: string;
  new_role?: Role;
  new_squad_ids?: number[];
}

export interface OrgTreeNode {
  user: User;
  children: OrgTreeNode[];
  pending_change?: DraftChange;
}
