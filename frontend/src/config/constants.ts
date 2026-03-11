// ─── Status Constants ─────────────────────────

export const JOB_STATUSES = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETE: 'complete',
  INVOICED: 'invoiced',
  PAID: 'paid',
} as const;

export const WORKGROUP_STATUSES = {
  DRAFT: 'draft',
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  IN_PROGRESS: 'in_progress',
  REVIEW: 'review',
  APPROVED: 'approved',
  COMPLETE: 'complete',
  DISPUTED: 'disputed',
} as const;

export const PROJECT_STATUSES = {
  DRAFT: 'draft',
  PLANNING: 'planning',
  ACTIVE: 'active',
  REVIEW: 'review',
  COMPLETE: 'complete',
  ON_HOLD: 'on_hold',
  CANCELLED: 'cancelled',
} as const;

export const INVOICE_STATUSES = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  AI_VALIDATED: 'ai_validated',
  AI_FLAGGED: 'ai_flagged',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PAID: 'paid',
} as const;

// ─── Priority Levels ─────────────────────────

export const PRIORITIES = {
  LOW: 'low',
  STANDARD: 'standard',
  URGENT: 'urgent',
  EMERGENCY: 'emergency',
} as const;

// ─── User Roles ──────────────────────────────

export const ROLES = {
  OWNER: 'owner',
  MANAGER: 'manager',
  SUPERVISOR: 'supervisor',
  CONTRACTOR: 'contractor',
  CREW_MEMBER: 'crew_member',
} as const;

// ─── Status Display Config ───────────────────

export const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  not_started: { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' },
  draft: { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' },
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-400' },
  planning: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-400' },
  accepted: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-400' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-400' },
  in_progress: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-400' },
  active: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-400' },
  review: { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-400' },
  approved: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-400' },
  complete: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  disputed: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-400' },
  on_hold: { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-400' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-400' },
  submitted: { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-400' },
  ai_validated: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-400' },
  ai_flagged: { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-400' },
  pending_approval: { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-400' },
  invoiced: { bg: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-400' },
  paid: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
};
