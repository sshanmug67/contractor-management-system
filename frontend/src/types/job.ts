export interface Job {
  id: string;
  workgroup_id: string;
  title: string;
  description: string;
  budget: number;
  est_duration_days: number;
  sequence: number;
  status: JobStatus;
  progress_pct: number;
  invoice_id: string | null;
  dependencies: string[]; // job IDs within same workgroup
  created_at: string;
  updated_at: string;
}

export type JobStatus =
  | 'not_started'
  | 'in_progress'
  | 'complete'
  | 'invoiced'
  | 'paid';

export interface CreateJobRequest {
  title: string;
  description: string;
  budget: number;
  est_duration_days: number;
  sequence: number;
  dependencies?: string[];
}

export interface UpdateJobRequest {
  title?: string;
  description?: string;
  budget?: number;
  est_duration_days?: number;
  sequence?: number;
  status?: JobStatus;
  dependencies?: string[];
}

export interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  completed_at?: string;
  verified_by?: string;
}

export interface JobChecklist {
  job_id: string;
  items: ChecklistItem[];
}
