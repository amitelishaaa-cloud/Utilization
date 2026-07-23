import type {
  Project,
  Retainer,
  PipelineDeal,
  ProjectWeeklyAllocation,
  CapacityException,
} from '@/lib/types'

export type WeekBreakdown = {
  weekStart: string       // ISO date YYYY-MM-DD, always Monday
  committedHours: number  // projects + retainers
  pipelineHours: number   // weighted pipeline contribution
  capacity: number        // available hours that week
  utilization: number     // (committedHours + pipelineHours) / capacity; 0 when capacity === 0
}

export type UtilizationInput = {
  defaultWeeklyHours: number
  startDate: Date
  endDate: Date
  projects: Project[]
  allocations: ProjectWeeklyAllocation[]
  retainers: Retainer[]
  deals: PipelineDeal[]
  capacityExceptions: CapacityException[]
}

export type RecommendationTag =
  | 'overload'
  | 'optimal'
  | 'warning'
  | 'urgent_gap'
  | 'mid_gap'
  | 'far_gap'
  | 'sustained_high'

export type RecommendationResult = {
  tag: RecommendationTag
  color: 'red' | 'green' | 'yellow' | 'dark_red' | 'orange' | 'blue'
  text: string                             // Hebrew state description — what's happening and why (no action directives)
  affectedMonthIndex: number | null        // 1-based; null for 'optimal' and 'sustained_high'
  affectedMonthUtilization: number | null  // e.g. 0.60 for 60%; null for 'optimal'
}
