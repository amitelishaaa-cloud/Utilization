'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createServerClient, getDevUserId } from '@/lib/supabase/server'

export async function createClientAction(
  _prev: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const name = (formData.get('name') as string).trim()
  if (!name) return { error: 'שם לקוח הוא שדה חובה' }

  const supabase = createServerClient()
  const { error } = await supabase
    .from('clients')
    .insert({ user_id: getDevUserId(), name })

  if (error) return { error: error.message }
  redirect('/clients')
}

export async function updateClientAction(
  id: string,
  _prev: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const name = (formData.get('name') as string).trim()
  if (!name) return { error: 'שם לקוח הוא שדה חובה' }

  const supabase = createServerClient()
  const { error } = await supabase
    .from('clients')
    .update({ name })
    .eq('id', id)
    .eq('user_id', getDevUserId())

  if (error) return { error: error.message }
  redirect('/clients')
}

export async function deleteClientAction(id: string): Promise<void> {
  const supabase = createServerClient()
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id)
    .eq('user_id', getDevUserId())

  if (error) throw new Error(error.message)
  revalidatePath('/clients')
}
