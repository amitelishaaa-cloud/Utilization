'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createServerClient, requireUser } from '@/lib/supabase/server'
import { validateRetainer } from '@/lib/validation'

function parseRetainerForm(formData: FormData) {
  const name = (formData.get('name') as string).trim()
  const client_id = formData.get('client_id') as string
  const pricing_type = formData.get('pricing_type') as 'hourly' | 'fixed_monthly'
  const monthly_hours = parseFloat(formData.get('monthly_hours') as string)
  const start_date = formData.get('start_date') as string
  const end_date_raw = (formData.get('end_date') as string).trim()
  const end_date = end_date_raw || null
  const status = formData.get('status') as 'active' | 'ended'
  const notes = (((formData.get('notes') as string) ?? '').trim()) || null

  let hourly_rate: number | null = null
  let monthly_fixed_price: number | null = null
  if (pricing_type === 'hourly') {
    hourly_rate = parseFloat(formData.get('hourly_rate') as string)
  } else {
    monthly_fixed_price = parseFloat(formData.get('monthly_fixed_price') as string)
  }

  return {
    name, client_id, pricing_type, monthly_hours,
    hourly_rate, monthly_fixed_price, start_date, end_date, status, notes,
  }
}

export async function createRetainerAction(
  _prev: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const data = parseRetainerForm(formData)
  const validationError = validateRetainer(data)
  if (validationError) return { error: validationError }

  const { id: userId } = await requireUser()
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('retainers')
    .insert({ user_id: userId, ...data })

  if (error) return { error: error.message }
  redirect('/retainers')
}

export async function updateRetainerAction(
  id: string,
  _prev: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const data = parseRetainerForm(formData)
  const validationError = validateRetainer(data)
  if (validationError) return { error: validationError }

  const { id: userId } = await requireUser()
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('retainers')
    .update(data)
    .eq('id', id)
    .eq('user_id', userId)

  if (error) return { error: error.message }
  redirect('/retainers')
}

export async function deleteRetainerAction(id: string): Promise<void> {
  const { id: userId } = await requireUser()
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('retainers')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
  revalidatePath('/retainers')
}
