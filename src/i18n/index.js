import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { DEFAULT_LOCALE } from './languages';

import en from '../locales/en.json';
import es from '../locales/es.json';
import fr from '../locales/fr.json';
import ptBR from '../locales/pt-BR.json';

const resources = {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
  'pt-BR': { translation: ptBR },
};

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: DEFAULT_LOCALE,
    fallbackLng: DEFAULT_LOCALE,
    compatibilityJSON: 'v4',
    interpolation: { escapeValue: false },
  });
}

export default i18n;
