import { createClient } from '@supabase/supabase-js';

// Supabase publishable key is designed for use in client-side applications.
// Storage access is restricted by the bucket's Row Level Security policies.
export const supabase = createClient(
  'https://hbuprpgjpwtiqjfgqyai.supabase.co',
  'sb_publishable_lUU38q5OfhiQJIZXdmjGXw_jpr32ESH'
);

export async function getStorageUserId(): Promise<string> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (sessionData.session?.user?.id) return sessionData.session.user.id;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  if (!data.user?.id) throw new Error('ছবি আপলোডের জন্য নিরাপদ সেশন তৈরি হয়নি।');
  return data.user.id;
}
