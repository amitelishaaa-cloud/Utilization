import type { PipelineDeal, PricingType, RetainerPricingType } from '@/lib/types'

/**
 * ערכי ברירת המחדל שהמודאל "מימוש עסקה" ממלא מראש מנתוני העסקה.
 * לוגיקה טהורה בלבד — ההכנסה ל-DB מתבצעת ב-realizeDealAction לפי מה שהמשתמש
 * בסופו של דבר הגיש, לא לפי הערכים כאן.
 */

/** ערך ה-option "לקוח חדש" ב-select של המודאל, משותף לטופס ול-Server Action */
export const NEW_CLIENT_VALUE = '__new__'

export type ProjectDefaults = {
  client_id: string | null
  name: string
  pricing_type: PricingType
  estimated_hours: number | null
  hourly_rate: number | null
  fixed_price: number | null
  start_date: string
  end_date: string | null
  is_end_date_estimated: boolean
}

export type RetainerDefaults = {
  client_id: string | null
  name: string
  monthly_hours: number | null
  pricing_type: RetainerPricingType
  hourly_rate: number | null
  monthly_fixed_price: number | null
  start_date: string
  end_date: string | null
}

export function buildProjectDefaults(deal: PipelineDeal): ProjectDefaults {
  return {
    client_id: deal.client_id,
    name: deal.name,
    pricing_type: deal.pricing_type,
    estimated_hours: deal.estimated_hours,
    hourly_rate: deal.hourly_rate,
    fixed_price: deal.fixed_price,
    start_date: deal.expected_start_date,
    end_date: deal.expected_end_date,
    // מקור התאריך הוא expected_end_date — כלומר הערכה, לא תאריך מחייב
    is_end_date_estimated: true,
  }
}

export function buildRetainerDefaults(deal: PipelineDeal): RetainerDefaults {
  return {
    client_id: deal.client_id,
    name: deal.name,
    monthly_hours: deal.monthly_hours,
    // enums שונים: pricing_type בעסקה הוא 'fixed', ב-retainers הוא 'fixed_monthly'
    pricing_type: deal.pricing_type === 'fixed' ? 'fixed_monthly' : 'hourly',
    hourly_rate: deal.hourly_rate,
    // deal.fixed_price הוא מחיר כולל לעסקה, לא מחיר לחודש — אין מיפוי ישיר,
    // המשתמש חייב להזין את הערך החודשי בעצמו
    monthly_fixed_price: null,
    start_date: deal.expected_start_date,
    end_date: deal.expected_end_date,
  }
}
