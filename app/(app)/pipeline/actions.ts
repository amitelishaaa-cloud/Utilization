'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createServerClient, requireUser } from '@/lib/supabase/server'
import { PIPELINE_STAGES } from '@/lib/pipeline-stages'
import { NEW_CLIENT_VALUE } from '@/lib/deal-realization'
import { validateProject, validateRetainer } from '@/lib/validation'
import { parsePriority } from '@/lib/priority'
import type { PipelineStage, DealStatus, DealType } from '@/lib/types'

function parseDealForm(formData: FormData) {
  const name = (formData.get('name') as string).trim()
  const client_id_raw = formData.get('client_id') as string
  const client_id = client_id_raw || null
  const current_stage = formData.get('current_stage') as PipelineStage
  const deal_type = formData.get('deal_type') as DealType
  const pricing_type = formData.get('pricing_type') as 'hourly' | 'fixed'

  let estimated_hours: number | null = null
  let monthly_hours: number | null = null
  if (deal_type === 'project') {
    estimated_hours = parseFloat(formData.get('estimated_hours') as string)
  } else {
    monthly_hours = parseFloat(formData.get('monthly_hours') as string)
  }

  const expected_start_date = formData.get('expected_start_date') as string
  const expected_end_date = (formData.get('expected_end_date') as string) || null

  const rawProbability = ((formData.get('probability_override') as string) ?? '').trim()
  const probability_override = rawProbability ? Number(rawProbability) / 100 : null

  const notes = (((formData.get('notes') as string) ?? '').trim()) || null
  const priority = parsePriority(formData.get('priority'))
  const reminder_date = (((formData.get('reminder_date') as string) ?? '').trim()) || null

  let hourly_rate: number | null = null
  let fixed_price: number | null = null
  if (pricing_type === 'hourly') {
    hourly_rate = parseFloat(formData.get('hourly_rate') as string)
  } else {
    fixed_price = parseFloat(formData.get('fixed_price') as string)
  }

  return {
    name, client_id, current_stage, deal_type, pricing_type,
    estimated_hours, monthly_hours,
    expected_start_date, expected_end_date,
    probability_override, hourly_rate, fixed_price,
    notes, priority, reminder_date,
  }
}

function validateDeal(data: ReturnType<typeof parseDealForm>): string | null {
  if (!data.name) return 'שם העסקה הוא שדה חובה'
  if (!data.deal_type || !(['project', 'retainer'] as const).includes(data.deal_type))
    return 'יש לבחור סוג עסקה'
  if (!data.current_stage || !(data.current_stage in PIPELINE_STAGES))
    return 'יש לבחור שלב בצינור'
  if (!data.expected_start_date) return 'תאריך התחלה הוא שדה חובה'

  if (data.deal_type === 'project') {
    if (isNaN(data.estimated_hours!) || data.estimated_hours! <= 0)
      return 'שעות מוערכות חייבות להיות מספר חיובי'
    if (!data.expected_end_date) return 'תאריך סיום הוא שדה חובה'
  } else {
    if (isNaN(data.monthly_hours!) || data.monthly_hours! <= 0)
      return 'שעות חודשיות חייבות להיות מספר חיובי'
  }

  if (data.expected_end_date && new Date(data.expected_end_date) < new Date(data.expected_start_date))
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

  const { id: userId } = await requireUser()
  const supabase = await createServerClient()

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

  const { id: userId } = await requireUser()
  const supabase = await createServerClient()

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

  // A freshly won deal opens the realization modal — unless it was already realized
  if (status === 'won') {
    const realizedId = await findRealizationId(supabase, data.deal_type, id)
    if (!realizedId) redirect(`/pipeline/${id}?realize=1`)
  }

  redirect('/pipeline')
}

// ─── Deal realization (won deal → project / retainer) ───────────────────────

type SupabaseClient = Awaited<ReturnType<typeof createServerClient>>

const ALREADY_REALIZED = 'העסקה כבר מומשה — כבר קיים פרויקט או ריטיינר שנוצר ממנה'

function targetTable(dealType: DealType) {
  return dealType === 'project' ? 'projects' : 'retainers'
}

/** Returns the id of the project/retainer created from this deal, or null */
async function findRealizationId(
  supabase: SupabaseClient,
  dealType: DealType,
  dealId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from(targetTable(dealType))
    .select('id')
    .eq('source_deal_id', dealId)
    .maybeSingle()

  return data?.id ?? null
}

type ClientIntent =
  | { kind: 'existing'; id: string }
  | { kind: 'new'; name: string }

function parseClientIntent(formData: FormData): ClientIntent | null {
  const selected = ((formData.get('client_id') as string) ?? '').trim()
  if (selected && selected !== NEW_CLIENT_VALUE) return { kind: 'existing', id: selected }

  const name = ((formData.get('new_client_name') as string) ?? '').trim()
  return name ? { kind: 'new', name } : null
}

async function resolveClientId(
  supabase: SupabaseClient,
  userId: string,
  intent: ClientIntent,
): Promise<{ id: string } | { error: string }> {
  if (intent.kind === 'existing') return { id: intent.id }

  const { data, error } = await supabase
    .from('clients')
    .insert({ user_id: userId, name: intent.name })
    .select('id')
    .single()

  if (error || !data) return { error: error?.message ?? 'יצירת הלקוח נכשלה' }
  return { id: data.id }
}

function parseRealizedProject(formData: FormData, client_id: string) {
  const pricing_type = formData.get('pricing_type') as 'hourly' | 'fixed'
  return {
    name: ((formData.get('name') as string) ?? '').trim(),
    client_id,
    pricing_type,
    estimated_hours: parseFloat(formData.get('estimated_hours') as string),
    actual_hours: null,
    hourly_rate:
      pricing_type === 'hourly' ? parseFloat(formData.get('hourly_rate') as string) : null,
    fixed_price:
      pricing_type === 'fixed' ? parseFloat(formData.get('fixed_price') as string) : null,
    start_date: formData.get('start_date') as string,
    end_date: formData.get('end_date') as string,
    is_end_date_estimated: formData.get('is_end_date_estimated') === 'on',
    status: 'active' as const,
    // עוברים בירושה מהעסקה — המודאל מגיש אותם מלאים מראש
    notes: (((formData.get('notes') as string) ?? '').trim()) || null,
    priority: parsePriority(formData.get('priority')),
    reminder_date: (((formData.get('reminder_date') as string) ?? '').trim()) || null,
  }
}

function parseRealizedRetainer(formData: FormData, client_id: string) {
  const pricing_type = formData.get('pricing_type') as 'hourly' | 'fixed_monthly'
  const end_date = ((formData.get('end_date') as string) ?? '').trim()
  return {
    name: ((formData.get('name') as string) ?? '').trim(),
    client_id,
    pricing_type,
    monthly_hours: parseFloat(formData.get('monthly_hours') as string),
    hourly_rate:
      pricing_type === 'hourly' ? parseFloat(formData.get('hourly_rate') as string) : null,
    monthly_fixed_price:
      pricing_type === 'fixed_monthly'
        ? parseFloat(formData.get('monthly_fixed_price') as string)
        : null,
    start_date: formData.get('start_date') as string,
    end_date: end_date || null,
    status: 'active' as const,
    // ל-retainers יש notes בלבד — אין לה עמודות priority/reminder_date
    notes: (((formData.get('notes') as string) ?? '').trim()) || null,
  }
}

export async function realizeDealAction(
  dealId: string,
  _prev: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const { id: userId } = await requireUser()
  const supabase = await createServerClient()

  const { data: deal } = await supabase
    .from('pipeline_deals')
    .select('id, deal_type, status')
    .eq('id', dealId)
    .eq('user_id', userId)
    .single()

  if (!deal) return { error: 'העסקה לא נמצאה' }
  if (deal.status !== 'won') return { error: 'אפשר לממש רק עסקה שנסגרה בהצלחה' }

  const dealType = deal.deal_type as DealType
  const isProject = dealType === 'project'

  if (await findRealizationId(supabase, dealType, dealId)) return { error: ALREADY_REALIZED }

  const clientIntent = parseClientIntent(formData)
  if (!clientIntent) return { error: 'יש לבחור לקוח' }

  // Validate before creating a new client, so a rejected form leaves no orphan client
  const provisionalId = clientIntent.kind === 'existing' ? clientIntent.id : 'pending'
  const projectFields = isProject ? parseRealizedProject(formData, provisionalId) : null
  const retainerFields = isProject ? null : parseRealizedRetainer(formData, provisionalId)

  const validationError = projectFields
    ? validateProject(projectFields)
    : validateRetainer(retainerFields!)
  if (validationError) return { error: validationError }

  const client = await resolveClientId(supabase, userId, clientIntent)
  if ('error' in client) return { error: client.error }

  const row = { client_id: client.id, user_id: userId, source_deal_id: dealId }
  const { error: insertError } = projectFields
    ? await supabase.from('projects').insert({ ...projectFields, ...row })
    : await supabase.from('retainers').insert({ ...retainerFields!, ...row })

  // 23505 = the partial unique index on source_deal_id — two submits raced
  if (insertError) {
    return { error: insertError.code === '23505' ? ALREADY_REALIZED : insertError.message }
  }

  revalidatePath('/pipeline')
  revalidatePath('/cockpit')
  revalidatePath(isProject ? '/projects' : '/retainers')
  redirect(isProject ? '/projects' : '/retainers')
}

export async function deleteDealAction(id: string): Promise<void> {
  const { id: userId } = await requireUser()
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('pipeline_deals')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
  revalidatePath('/pipeline')
}
