import { supabase } from "@/integrations/supabase/client";

/**
 * Utility to sync missing profiles from auth.users to profiles table
 * Should be called before fetching users in admin contexts
 */
export async function syncMissingProfiles(): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('sync_missing_profiles');
    if (error) throw error;
    return data ?? 0;
  } catch {
    // Silently ignore errors - user may not be admin or function may not exist
    return 0;
  }
}
