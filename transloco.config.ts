import { TranslocoGlobalConfig } from '@jsverse/transloco-utils';

const config: TranslocoGlobalConfig = {
  rootTranslationsPath: 'apps/web/public/i18n/',
  langs: ['en', 'cs'],
  keysManager: {
    input: ['apps/web/src'],
  },
};

export default config;
