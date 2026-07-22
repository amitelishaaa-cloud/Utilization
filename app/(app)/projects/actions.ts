'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createServerClient, getDevUserId } from '@/lib/supabase/server'

function parseProjectForm(formData: FormData) {
  const name = (formData.get('name') as string).trim()
  const client_id = formData.get('client_id') as string
  const pricing_type = formData.get('pricing_type') as 'hourly' | 'fixed'
  const estimated_hours = parseFloat(formData.get('estimated_hours') as string)
  const actual_hours_raw = (formData.get('actual_hours') as string).trim()
  const actual_hours = actual_hours_raw ? parseFloat(actual_hours_raw) : null
  const start_date = formData.get('start_date') as string
  const end_date = formData.get('end_date') as string
  const is_end_date_estimated = formData.get('is_end_date_estimated') === 'on'
  const status = formData.get('status') as 'active' | 'completed' | 'cancelled'

  let hourly_rate: number | null = null
  let fixed_price: number | null = null
  if (pricing_type === 'hourly') {
    hourly_rate = parseFloat(formData.get('hourly_rate') as string)
  } else {
    fixed_price = parseFloat(formData.get('fixed_price') as string)
  }

  return {
    name, client_id, pricing_type, estimated_hours, actual_hours,
    hourly_rate, fixed_price, start_date, end_date, is_end_date_estimated, status,
  }
}

function validateProject(data: ReturnType<typeof parseProjectForm>): string | null {
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

export async function createProjectAction(
  _prev: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const data = parseProjectForm(formData)
  const validationError = validateProject(data)
  if (validationError) return { error: validationError }

  const supabase = createServerClient()
  const { error } = await supabase
    .from('projects')
    .insert({ user_id: getDevUserId(), ...data })

  if (error) return { error: error.message }
  redirect('/projects')
}

export async function updateProjectAction(
  id: string,
  _prev: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const data = parseProjectForm(formData)
  const validationError = validateProject(data)
  if (validationError) return { error: validationError }

  const supabase = createServerClient()
  const { error } = await supabase
    .from('projects')
    .update(data)
    .eq('id', id)
    .eq('user_id', getDevUserId())

  if (error) return { error: error.message }
  redirect('/projects')
}

export async function deleteProjectAction(id: string): Promise<void> {
  const supabase = createServerClient()
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)
    .eq('user_id', getDevUserId())

  if (error) throw new Error(error.message)
  revalidatePath('/projects')
}
