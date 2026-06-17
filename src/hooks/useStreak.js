import { useState, useCallback } from 'react';
import { supabase } from '../config/supabase';

export function useStreak() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from('profiles')
      .select('full_name, streak_count, last_active_date, created_at')
      .eq('id', user.id)
      .single();

    setProfile({ ...data, email: user.email });
    setLoading(false);
  }, []);

  const updateStreak = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.rpc('update_streak', { p_user_id: user.id });
  }, []);

  return { profile, loading, fetchProfile, updateStreak };
}
