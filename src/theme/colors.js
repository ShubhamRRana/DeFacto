import { lightColors } from './palettes';

export const colors = lightColors;

export function getTypography(palette, { isArabic = false } = {}) {
  const sans = isArabic ? 'NotoSansArabic_400Regular' : 'Merriweather_400Regular';
  const sansMedium = isArabic ? 'NotoSansArabic_500Medium' : 'Merriweather_500Medium';
  const sansSemiBold = isArabic ? 'NotoSansArabic_600SemiBold' : 'Merriweather_600SemiBold';
  const serifDisplay = isArabic ? 'NotoSansArabic_400Regular' : 'Newsreader_400Regular';
  const serifDisplayMedium = isArabic ? 'NotoSansArabic_500Medium' : 'Newsreader_500Medium';
  const ui = isArabic ? 'NotoSansArabic_400Regular' : 'HankenGrotesk_400Regular';
  const uiMedium = isArabic ? 'NotoSansArabic_500Medium' : 'HankenGrotesk_500Medium';
  const uiSemiBold = isArabic ? 'NotoSansArabic_600SemiBold' : 'HankenGrotesk_600SemiBold';
  const uiBold = isArabic ? 'NotoSansArabic_700Bold' : 'HankenGrotesk_700Bold';

  return {
    fontFamily: {
      sans,
      sansMedium,
      sansSemiBold,
      serifDisplay,
      serifDisplayMedium,
      ui,
      uiMedium,
      uiSemiBold,
      uiBold,
    },
    fontSizes: {
      xs: 11,
      sm: 13,
      md: 16,
      lg: 20,
      xl: 24,
      xxl: 32,
      xxxl: 40,
    },
    fontWeights: {
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
    },
    presets: {
      displayLg: {
        fontFamily: sans,
        fontSize: 36,
        fontWeight: '400',
        lineHeight: 43,
        letterSpacing: 0,
        color: palette.ink,
      },
      displayMd: {
        fontFamily: sans,
        fontSize: 26,
        fontWeight: '400',
        lineHeight: 33,
        letterSpacing: 0,
        color: palette.ink,
      },
      displaySm: {
        fontFamily: sans,
        fontSize: 22,
        fontWeight: '400',
        lineHeight: 29,
        letterSpacing: 0,
        color: palette.ink,
      },
      titleMd: {
        fontFamily: sansSemiBold,
        fontSize: 18,
        fontWeight: '600',
        lineHeight: 25,
        letterSpacing: 0,
        color: palette.ink,
      },
      titleSm: {
        fontFamily: sansSemiBold,
        fontSize: 16,
        fontWeight: '600',
        lineHeight: 22,
        letterSpacing: 0,
        color: palette.ink,
      },
      bodyMd: {
        fontFamily: sans,
        fontSize: 16,
        fontWeight: '400',
        lineHeight: 24,
        letterSpacing: 0,
        color: palette.body,
      },
      bodySm: {
        fontFamily: sans,
        fontSize: 14,
        fontWeight: '400',
        lineHeight: 21,
        letterSpacing: 0,
        color: palette.body,
      },
      caption: {
        fontFamily: sans,
        fontSize: 13,
        fontWeight: '400',
        lineHeight: 18,
        letterSpacing: 0,
        color: palette.muted,
      },
      button: {
        fontFamily: uiSemiBold,
        fontSize: 16,
        fontWeight: '600',
        lineHeight: 22,
        letterSpacing: 0,
      },
      captionUppercase: {
        fontFamily: sansSemiBold,
        fontSize: 11,
        fontWeight: '600',
        lineHeight: 15,
        letterSpacing: 0.88,
        textTransform: 'uppercase',
        color: palette.ink,
      },
    },
  };
}

export const typography = getTypography(colors);

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  section: 80,
};

export const borderRadius = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 9999,
  full: 9999,
};
