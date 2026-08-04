import { createServerClient, requireUser } from '@/lib/supabase/server'
import SettingsForm from '@/components/settings/settings-form'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const { id: userId } = await requireUser()
  const supabase = await createServerClient()
  const { data: user } = await supabase
    .from('users')
    .select('default_weekly_hours, works_friday')
    .eq('id', userId)
    .single()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">הגדרות</h1>
        <p className="text-sm text-gray-500 mt-1">קיבולת עבודה שבועית — משפיעה על חישוב הניצול</p>
      </div>

      <SettingsForm
        defaultWeeklyHours={user?.default_weekly_hours ?? 40}
        worksFriday={user?.works_friday ?? false}
      />
    </div>
  )
}
