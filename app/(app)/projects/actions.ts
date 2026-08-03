'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createServerClient, requireUser } from '@/lib/supabase/server'
import { validateProject } from '@/lib/validation'

function parseProjectForm(formData: FormData) {
  const name = (formData.get('name') as string).trim()
  const client_id = formData.get('client_id') as string
  const pricing_type = formData.get('pricing_type') as 'hourly' | 'fixed'
  const estimated_hours = parseFloat(formData.get('estimated_hours') as string)
  const actual_hours_raw = ((formData.get('actual_hours') as string) ?? '').trim()
  const actual_hours = actual_hours_raw ? parseFloat(actual_hours_raw) : null
  const start_date = formData.get('start_date') as string
  const end_date = formData.get('end_date') as string
  const is_end_date_estimated = formData.get('is_end_date_estimated') === 'on'
  const status = (formData.get('status') as 'active' | 'completed' | 'cancelled') ?? 'active'

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

export async function createProjectAction(
  _prev: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const data = parseProjectForm(formData)
  const validationError = validateProject(data)
  if (validationError) return { error: validationError }

  const { id: userId } = await requireUser()
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('projects')
    .insert({ user_id: userId, ...data })

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

  const { id: userId } = await requireUser()
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('projects')
    .update(data)
    .eq('id', id)
    .eq('user_id', userId)

  if (error) return { error: error.message }
  redirect('/projects')
}

export async function deleteProjectAction(id: string): Promise<void> {
  const { id: userId } = await requireUser()
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
  revalidatePath('/projects')
}
