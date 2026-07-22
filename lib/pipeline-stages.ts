import type { PipelineStage } from '@/lib/types'

export const PIPELINE_STAGES: Record<PipelineStage, { label: string; probability: number }> = {
  inquiry:      { label: 'פנייה ראשונית', probability: 0.10 },
  proposal:     { label: 'הצעה נשלחה',    probability: 0.30 },
  negotiation:  { label: 'משא ומתן',      probability: 0.55 },
  verbal_close: { label: 'סגר בעל פה',    probability: 0.80 },
  contract:     { label: 'חוזה / יומן',   probability: 1.00 },
}
