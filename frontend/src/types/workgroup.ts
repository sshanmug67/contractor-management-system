export interface Workgroup {
  id: string;
  project_id: string;
  contractor_id: string | null;
  title: string;
  trade: string;
  description: string;
  budget: number;
  start_date: string;
  end_date: string;
  status: WorkgroupStatus;
  progress_pct: number;
  dependencies: string[]; // workgroup IDs
  total_invoiced: number;
  total_paid: number;
  created_at: string;
  updated_at: string;
}

export type WorkgroupStatus =
  | 'draft'
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'in_progress'
  | 'review'
  | 'approved'
  | 'complete'
  | 'disputed';

export interface CreateWorkgroupRequest {
  title: string;
  trade: string;
  description: string;
  budget: number;
  start_date: string;
  end_date: string;
  dependencies?: string[];
}

export interface UpdateWorkgroupRequest {
  title?: string;
  trade?: string;
  description?: string;
  budget?: number;
  start_date?: string;
  end_date?: string;
  status?: WorkgroupStatus;
  dependencies?: string[];
}

export interface WorkgroupAllocation {
  workgroup_id: string;
  contractor_id: string;
  ai_score: number;
  assigned_at: string;
  responded_at?: string;
  status: 'pending' | 'accepted' | 'rejected';
  reject_reason?: string;
}
