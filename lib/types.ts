export type PipelineStage = 'inquiry' | 'proposal' | 'negotiation' | 'verbal_close' | 'contract'
export type DealStatus = 'active' | 'won' | 'lost'

export type PipelineDeal = {
  id: string
  user_id: string
  client_id: string | null
  name: string
  pricing_type: PricingType
  estimated_hours: number
  hourly_rate: number | null
  fixed_price: number | null
  expected_start_date: string
  expected_end_date: string
  current_stage: PipelineStage
  probability_override: number | null
  status: DealStatus
  created_at: string
  closed_at: string | null
  clients?: { name: string } | null
}

export type PipelineStageHistory = {
  id: string
  deal_id: string
  from_stage: PipelineStage | null
  to_stage: PipelineStage
  changed_at: string
}

export type Client = {
  id: string
  user_id: string
  name: string
  created_at: string
}

export type PricingType = 'hourly' | 'fixed'
export type RetainerPricingType = 'hourly' | 'fixed_monthly'
export type ProjectStatus = 'active' | 'completed' | 'cancelled'
export type RetainerStatus = 'active' | 'ended'

export type Project = {
  id: string
  user_id: string
  client_id: string
  source_deal_id: string | null
  name: string
  pricing_type: PricingType
  estimated_hours: number
  actual_hours: number | null
  hourly_rate: number | null
  fixed_price: number | null
  start_date: string
  end_date: string
  is_end_date_estimated: boolean
  status: ProjectStatus
  created_at: string
  clients?: { name: string } | null
}

export type Retainer = {
  id: string
  user_id: string
  client_id: string
  name: string
  monthly_hours: number
  pricing_type: RetainerPricingType
  hourly_rate: number | null
  monthly_fixed_price: number | null
  start_date: string
  end_date: string | null
  status: RetainerStatus
  created_at: string
  clients?: { name: string } | null
}

export type ProjectWeeklyAllocation = {
  id: string
  project_id: string
  week_start: string       // ISO date YYYY-MM-DD, always a Monday
  allocated_hours: number
}

export type CapacityException = {
  id: string
  user_id: string
  week_start: string       // ISO date YYYY-MM-DD, always a Monday
  available_hours: number
  reason: string | null
  created_at: string
}
