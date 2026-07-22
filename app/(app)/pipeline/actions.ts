'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createServerClient, getDevUserId } from '@/lib/supabase/server'
import { PIPELINE_STAGES } from '@/lib/pipeline-stages'
import type { PipelineStage, DealStatus } from '@/lib/types'

function parseDealForm(formData: FormData) {
  const name = (formData.get('name') as string).trim()
  const client_id_raw = formData.get('client_id') as string
  const client_id = client_id_raw || null
  const current_stage = formData.get('current_stage') as PipelineStage
  const pricing_type = formData.get('pricing_type') as 'hourly' | 'fixed'
  const estimated_hours = parseFloat(formData.get('estimated_hours') as string)
  const expected_start_date = formData.get('expected_start_date') as string
  const expected_end_date = formData.get('expected_end_date') as string

  const rawProbability = ((formData.get('probability_override') as string) ?? '').trim()
  const probability_override = rawProbability ? Number(rawProbability) / 100 : null

  let hourly_rate: number | null = null
  let fixed_price: number | null = null
  if (pricing_type === 'hourly') {
    hourly_rate = parseFloat(formData.get('hourly_rate') as string)
  } else {
    fixed_price = parseFloat(formData.get('fixed_price') as string)
  }

  return {
    name, client_id, current_stage, pricing_type, estimated_hours,
    expected_start_date, expected_end_date, probability_override,
    hourly_rate, fixed_price,
  }
}

function validateDeal(data: ReturnType<typeof parseDealForm>): string | null {
  if (!data.name) return 'שם העסקה הוא שדה חובה'
  if (!data.current_stage || !(data.current_stage in PIPELINE_STAGES))
    return 'יש לבחור שלב בצינור'
  if (isNaN(data.estimated_hours) || data.estimated_hours <= 0)
    return 'שעות מוערכות חייבות להיות מספר חיובי'
  if (!data.expected_start_date) return 'תאריך התחלה הוא שדה חובה'
  if (!data.expected_end_date) return 'תאריך סיום הוא שדה חובה'
  if (new Date(data.expected_end_date) < new Date(data.expected_start_date))
    return 'תאריך הסיום חייב להיות אחרי תאריך ההתחלה'
  if (data.probability_override !== null &&
      (data.probability_override < 0 || data.probability_override > 1))
    return 'אחוז הסתברות חייב להיות בין 0 ל-100'
  if (data.pricing_type === 'hourly' && (isNaN(data.hourly_rate!) || data.hourly_rate! <= 0))
    return 'תעריף לשעה חייב להיות מספר חיובי'
  if (data.pricing_type === 'fixed' && (isNaN(data.fixed_price!) || data.fixed_price! <= 0))
    return 'מחיר קבוע חייב להיות מספר חיובי'
  return null
}

export async function createDealAction(
  _prev: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const data = parseDealForm(formData)
  const validationError = validateDeal(data)
  if (validationError) return { error: validationError }

  const supabase = createServerClient()
  const userId = getDevUserId()

  const { data: deal, error } = await supabase
    .from('pipeline_deals')
    .insert({ user_id: userId, ...data, status: 'active', closed_at: null })
    .select('id')
    .single()

  if (error) return { error: error.message }

  // Record initial stage entry (from_stage = null marks deal creation)
  await supabase.from('pipeline_stage_history').insert({
    deal_id: deal.id,
    from_stage: null,
    to_stage: data.current_stage,
  })

  redirect('/pipeline')
}

export async function updateDealAction(
  id: string,
  _prev: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const data = parseDealForm(formData)
  const validationError = validateDeal(data)
  if (validationError) return { error: validationError }

  const status = (formData.get('status') as DealStatus) || 'active'

  const supabase = createServerClient()
  const userId = getDevUserId()

  const { data: current, error: fetchError } = await supabase
    .from('pipeline_deals')
    .select('current_stage')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (fetchError || !current) return { error: 'העסקה לא נמצאה' }

  // Won deals must be at contract stage — auto-advance if needed
  const effectiveStage: PipelineStage =
    status === 'won' && data.current_stage !== 'contract' ? 'contract' : data.current_stage

  // DB constraint: closed_at must be null when active, non-null when won/lost
  const closed_at = status === 'active' ? null : new Date().toISOString()

  const { error } = await supabase
    .from('pipeline_deals')
    .update({ ...data, current_stage: effectiveStage, status, closed_at })
    .eq('id', id)
    .eq('user_id', userId)

  if (error) return { error: error.message }

  // Insert stage history only if the stage actually changed
  if (effectiveStage !== current.current_stage) {
    await supabase.from('pipeline_stage_history').insert({
      deal_id: id,
      from_stage: current.current_stage,
      to_stage: effectiveStage,
    })
  }

  redirect('/pipeline')
}

export async function deleteDealAction(id: string): Promise<void> {
  const supabase = createServerClient()
  const { error } = await supabase
    .from('pipeline_deals')
    .delete()
    .eq('id', id)
    .eq('user_id', getDevUserId())

  if (error) throw new Error(error.message)
  revalidatePath('/pipeline')
}
