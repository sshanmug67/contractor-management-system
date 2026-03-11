export interface Invoice {
  id: string;
  workgroup_id: string;
  contractor_id: string;
  invoice_number: string; // sequential per workgroup (INV-001, INV-002)
  amount: number;
  line_items: InvoiceLineItem[];
  status: InvoiceStatus;
  ai_validated: boolean;
  ai_flags: AIFlag[];
  approved_by?: string;
  approved_at?: string;
  file_url?: string;
  notes?: string;
  submitted_at: string;
  paid_at?: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceLineItem {
  job_id: string;
  job_title: string;
  amount: number;
  job_budget: number;
  variance: number; // amount - job_budget
  description?: string;
}

export type InvoiceStatus =
  | 'draft'
  | 'submitted'
  | 'ai_validated'
  | 'ai_flagged'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'paid';

export interface AIFlag {
  type: 'double_billing' | 'budget_exceeded' | 'job_incomplete' | 'duplicate' | 'mismatch' | 'other';
  message: string;
  severity: 'warning' | 'error';
  job_id?: string;
}

export interface SubmitInvoiceRequest {
  line_items: {
    job_id: string;
    amount: number;
    description?: string;
  }[];
  notes?: string;
  file_url?: string;
}

export interface WorkgroupInvoiceSummary {
  workgroup_id: string;
  workgroup_budget: number;
  total_invoiced: number;
  total_paid: number;
  remaining: number;
  invoices: Invoice[];
  uninvoiced_jobs: {
    job_id: string;
    job_title: string;
    budget: number;
    status: string;
  }[];
}
