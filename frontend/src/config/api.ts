const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const API_ENDPOINTS = {
  // Projects
  projects: `${API_BASE_URL}/projects`,
  project: (id: string) => `${API_BASE_URL}/projects/${id}`,

  // Workgroups
  projectWorkgroups: (projectId: string) =>
    `${API_BASE_URL}/projects/${projectId}/workgroups`,
  workgroup: (id: string) => `${API_BASE_URL}/workgroups/${id}`,
  acceptWorkgroup: (id: string) => `${API_BASE_URL}/workgroups/${id}/accept`,
  rejectWorkgroup: (id: string) => `${API_BASE_URL}/workgroups/${id}/reject`,
  submitWorkgroup: (id: string) => `${API_BASE_URL}/workgroups/${id}/submit`,

  // Jobs
  workgroupJobs: (workgroupId: string) =>
    `${API_BASE_URL}/workgroups/${workgroupId}/jobs`,
  job: (id: string) => `${API_BASE_URL}/jobs/${id}`,
  jobStatus: (id: string) => `${API_BASE_URL}/jobs/${id}/status`,
  jobChecklist: (id: string) => `${API_BASE_URL}/jobs/${id}/checklist`,

  // Contractors
  contractors: `${API_BASE_URL}/contractors`,
  contractor: (id: string) => `${API_BASE_URL}/contractors/${id}`,
  contractorWorkgroups: (id: string) =>
    `${API_BASE_URL}/contractors/${id}/workgroups`,

  // Messaging
  workgroupMessages: (workgroupId: string) =>
    `${API_BASE_URL}/workgroups/${workgroupId}/messages`,

  // Uploads
  presignedUrl: `${API_BASE_URL}/uploads/presigned-url`,

  // Invoices
  workgroupInvoices: (workgroupId: string) =>
    `${API_BASE_URL}/workgroups/${workgroupId}/invoices`,
  invoices: `${API_BASE_URL}/invoices`,
  invoice: (id: string) => `${API_BASE_URL}/invoices/${id}`,
  approveInvoice: (id: string) => `${API_BASE_URL}/invoices/${id}/approve`,
  rejectInvoice: (id: string) => `${API_BASE_URL}/invoices/${id}/reject`,
} as const;

export default API_ENDPOINTS;
