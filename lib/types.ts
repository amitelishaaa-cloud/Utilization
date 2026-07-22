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
