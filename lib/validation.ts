/**
 * ולידציה משותפת לישויות שנכתבות מיותר ממקום אחד.
 * הפונקציות האלה לא יכולות לשבת ב-actions.ts: מקובץ `'use server'` מותר לייצא
 * אך ורק פונקציות async.
 */

export type ProjectFields = {
  name: string
  client_id: string
  pricing_type: 'hourly' | 'fixed'
  estimated_hours: number
  actual_hours: number | null
  start_date: string
  end_date: string
  hourly_rate: number | null
  fixed_price: number | null
}

export function validateProject(data: ProjectFields): string | null {
  if (!data.name) return 'שם פרויקט הוא שדה חובה'
  if (!data.client_id) return 'יש לבחור לקוח'
  if (isNaN(data.estimated_hours) || data.estimated_hours <= 0)
    return 'שעות מוערכות חייבות להיות מספר חיובי'
  if (data.actual_hours !== null && data.actual_hours < 0)
    return 'שעות בפועל לא יכולות להיות שליליות'
  if (!data.start_date) return 'תאריך התחלה הוא שדה חובה'
  if (!data.end_date) return 'תאריך סיום הוא שדה חובה'
  if (new Date(data.end_date) < new Date(data.start_date))
    return 'תאריך הסיום חייב להיות אחרי תאריך ההתחלה'
  if (data.pricing_type === 'hourly' && (isNaN(data.hourly_rate!) || data.hourly_rate! <= 0))
    return 'תעריף לשעה חייב להיות מספר חיובי'
  if (data.pricing_type === 'fixed' && (isNaN(data.fixed_price!) || data.fixed_price! <= 0))
    return 'מחיר כולל חייב להיות מספר חיובי'
  return null
}

export type RetainerFields = {
  name: string
  client_id: string
  pricing_type: 'hourly' | 'fixed_monthly'
  monthly_hours: number
  start_date: string
  end_date: string | null
  hourly_rate: number | null
  monthly_fixed_price: number | null
}

export function validateRetainer(data: RetainerFields): string | null {
  if (!data.name) return 'שם הרטיינר הוא שדה חובה'
  if (!data.client_id) return 'יש לבחור לקוח'
  if (isNaN(data.monthly_hours) || data.monthly_hours <= 0)
    return 'שעות חודשיות חייבות להיות מספר חיובי'
  if (!data.start_date) return 'תאריך התחלה הוא שדה חובה'
  if (data.end_date && new Date(data.end_date) < new Date(data.start_date))
    return 'תאריך הסיום חייב להיות אחרי תאריך ההתחלה'
  if (data.pricing_type === 'hourly' && (isNaN(data.hourly_rate!) || data.hourly_rate! <= 0))
    return 'תעריף לשעה חייב להיות מספר חיובי'
  if (
    data.pricing_type === 'fixed_monthly' &&
    (isNaN(data.monthly_fixed_price!) || data.monthly_fixed_price! <= 0)
  )
    return 'מחיר חודשי חייב להיות מספר חיובי'
  return null
}
