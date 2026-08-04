'use server'
import { revalidatePath } from 'next/cache'
import { createServerClient, requireUser } from '@/lib/supabase/server'

export async function updateSettingsAction(
  _prev: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const defaultWeeklyHours = parseFloat(formData.get('default_weekly_hours') as string)
  const worksFriday = formData.get('works_friday') === 'on'

  if (!Number.isFinite(defaultWeeklyHours) || defaultWeeklyHours <= 0) {
    return { error: 'קיבולת שבועית חייבת להיות מספר חיובי' }
  }

  const { id: userId } = await requireUser()
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('users')
    .update({ default_weekly_hours: defaultWeeklyHours, works_friday: worksFriday })
    .eq('id', userId)

  if (error) return { error: error.message }

  revalidatePath('/settings')
  revalidatePath('/cockpit')
  return { error: null }
}
