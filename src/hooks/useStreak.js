import { useState, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { isSupportedLocale } from '../i18n/languages';

export function useStreak() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return null; }

    const { data } = await supabase
      .from('profiles')
      .select('full_name, streak_count, last_active_date, created_at, preferred_locale')
      .eq('id', user.id)
      .single();

    const profileData = { ...data, email: user.email };
    setProfile(profileData);
    setLoading(false);
    return profileData;
  }, []);

  const updateStreak = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.rpc('update_streak', { p_user_id: user.id });
  }, []);

  const syncPreferredLocale = useCallback(async (userId, locale) => {
    if (!userId || !isSupportedLocale(locale)) return;
    await supabase
      .from('profiles')
      .upsert({ id: userId, preferred_locale: locale }, { onConflict: 'id' });
  }, []);

  return { profile, loading, fetchProfile, updateStreak, syncPreferredLocale };
}
