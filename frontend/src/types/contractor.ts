export interface Contractor {
  id: string;
  org_id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  skills: string[];
  certifications: string[];
  rating: number;
  performance: ContractorPerformance;
  availability: ContractorAvailability;
  address: string;
  created_at: string;
  updated_at: string;
}

export interface ContractorPerformance {
  total_workgroups: number;
  completed_workgroups: number;
  completion_rate: number;
  on_time_rate: number;
  avg_rating: number;
  total_earned: number;
}

export interface ContractorAvailability {
  max_concurrent_workgroups: number;
  current_workgroup_count: number;
  available: boolean;
  unavailable_until?: string;
}

export interface ContractorRecommendation {
  contractor: Contractor;
  score: number;
  confidence: number;
  factors: {
    skill_match: number;
    past_performance: number;
    availability: number;
    proximity: number;
    pricing: number;
  };
  risk_flags: string[];
  estimated_completion: string;
}
