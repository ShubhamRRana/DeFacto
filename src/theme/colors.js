import { lightColors } from './palettes';

export const colors = lightColors;

export function getTypography(palette) {
  return {
    fontFamily: {
      sans: 'Merriweather_400Regular',
      sansMedium: 'Merriweather_500Medium',
      sansSemiBold: 'Merriweather_600SemiBold',
      serifDisplay: 'Newsreader_400Regular',
      serifDisplayMedium: 'Newsreader_500Medium',
      ui: 'HankenGrotesk_400Regular',
      uiMedium: 'HankenGrotesk_500Medium',
      uiSemiBold: 'HankenGrotesk_600SemiBold',
      uiBold: 'HankenGrotesk_700Bold',
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
        fontFamily: 'Merriweather_400Regular',
        fontSize: 36,
        fontWeight: '400',
        lineHeight: 43,
        letterSpacing: 0,
        color: palette.ink,
      },
      displayMd: {
        fontFamily: 'Merriweather_400Regular',
        fontSize: 26,
        fontWeight: '400',
        lineHeight: 33,
        letterSpacing: 0,
        color: palette.ink,
      },
      displaySm: {
        fontFamily: 'Merriweather_400Regular',
        fontSize: 22,
        fontWeight: '400',
        lineHeight: 29,
        letterSpacing: 0,
        color: palette.ink,
      },
      titleMd: {
        fontFamily: 'Merriweather_600SemiBold',
        fontSize: 18,
        fontWeight: '600',
        lineHeight: 25,
        letterSpacing: 0,
        color: palette.ink,
      },
      titleSm: {
        fontFamily: 'Merriweather_600SemiBold',
        fontSize: 16,
        fontWeight: '600',
        lineHeight: 22,
        letterSpacing: 0,
        color: palette.ink,
      },
      bodyMd: {
        fontFamily: 'Merriweather_400Regular',
        fontSize: 16,
        fontWeight: '400',
        lineHeight: 24,
        letterSpacing: 0,
        color: palette.body,
      },
      bodySm: {
        fontFamily: 'Merriweather_400Regular',
        fontSize: 14,
        fontWeight: '400',
        lineHeight: 21,
        letterSpacing: 0,
        color: palette.body,
      },
      caption: {
        fontFamily: 'Merriweather_400Regular',
        fontSize: 13,
        fontWeight: '400',
        lineHeight: 18,
        letterSpacing: 0,
        color: palette.muted,
      },
      button: {
        fontFamily: 'Merriweather_500Medium',
        fontSize: 14,
        fontWeight: '500',
        lineHeight: 14,
        letterSpacing: 0,
      },
      captionUppercase: {
        fontFamily: 'Merriweather_600SemiBold',
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
