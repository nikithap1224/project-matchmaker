import { createClient } from '@/lib/supabase/server';

export async function logAction(userId, action) {
  const supabase = await createClient();
  const { error } = await supabase.from('logs').insert({ user_id: userId, action });
  if (error) console.error('Failed to write log:', error);
}