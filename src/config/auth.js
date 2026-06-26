const DEFAULT_EMAIL_REDIRECT_URL = 'https://bludrop.in/email-confirmed.html';

export const AUTH_EMAIL_REDIRECT_URL =
  process.env.EXPO_PUBLIC_AUTH_EMAIL_REDIRECT_URL ?? DEFAULT_EMAIL_REDIRECT_URL;
