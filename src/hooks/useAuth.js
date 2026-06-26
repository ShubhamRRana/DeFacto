import { useState } from 'react';
import { supabase } from '../config/supabase';

function toErrorMessage(error) {
  if (!error) return null;
  if (typeof error === 'string') return error;
  return error.message ?? 'Something went wrong. Please try again.';
}

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const signUp = async (email, password, fullName, preferredLocale = 'en') => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            preferred_locale: preferredLocale,
          },
        },
      });

      if (signUpError) {
        const message = toErrorMessage(signUpError);
        setError(message);
        return { data: null, error: message };
      }

      const needsEmailConfirmation = data.user && !data.user.email_confirmed_at;
      if (needsEmailConfirmation && data.session) {
        await supabase.auth.signOut();
      }

      return { data, error: null };
    } catch (err) {
      const message = toErrorMessage(err);
      setError(message);
      return { data: null, error: message };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      const message = toErrorMessage(signInError);
      if (message) setError(message);
      return { data, error: message };
    } catch (err) {
      const message = toErrorMessage(err);
      setError(message);
      return { data: null, error: message };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    const { error: signOutError } = await supabase.auth.signOut();
    setLoading(false);
    return { error: toErrorMessage(signOutError) };
  };

  const changePassword = async (currentPassword, newPassword) => {
    setLoading(true);
    setError(null);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user?.email) {
      setLoading(false);
      const message = userError?.message ?? 'Could not verify your account.';
      setError(message);
      return { error: message };
    }

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (verifyError) {
      setLoading(false);
      const message = toErrorMessage(verifyError);
      setError(message);
      return { error: message };
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });
    setLoading(false);
    const message = toErrorMessage(updateError);
    if (message) setError(message);
    return { error: message };
  };

  return { signUp, signIn, signOut, changePassword, loading, error };
}
