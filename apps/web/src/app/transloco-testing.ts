import { TranslocoTestingModule } from '@jsverse/transloco';

const EN = {
  app: {
    home: 'Power Market Dashboard home',
    language: {
      'switch-to-cs': 'Switch to Czech',
      'switch-to-en': 'Switch to English',
    },
    navigation: {
      balancing: 'Balancing',
      open: 'Open navigation',
      primary: 'Primary navigation',
      solar: 'Solar',
    },
    'scroll-top': 'Scroll up',
    theme: {
      'switch-to-dark': 'Switch to dark theme',
      'switch-to-light': 'Switch to light theme',
    },
  },
  'app-update': {
    confirm: 'Update',
    description: 'Reload to use the latest version.',
    dismiss: 'Not now',
    title: 'A new version is available',
  },
  balancing: {
    badges: {
      'source-tooltip': 'Data for the Hungarian market comes from the ENTSO-E platform.',
    },
    description: 'Regulatory energy bid ladder visualization will appear here.',
    title: 'Balancing bid ladder',
  },
  market: {
    'badge-tooltips': {
      complete: 'All expected records are present.',
      connection: {
        connecting: 'Connecting for automatic data updates.',
        delayed: 'Source data or updates are delayed.',
        live: 'Live updates are connected.',
        offline: 'Live updates are unavailable.',
      },
      incomplete: 'Some expected records are missing.',
    },
    complete: 'Complete',
    connecting: 'Connecting live updates',
    delayed: 'Data delayed',
    incomplete: 'Incomplete',
    live: 'Live',
    offline: 'Live updates unavailable',
  },
  'not-found': {
    back: 'Back to dashboard',
    description: 'The page you’re looking for doesn’t exist or may have moved.',
    title: 'Page not found',
  },
  routes: {
    balancing: 'Balancing',
    'not-found': 'Page Not Found',
    solar: 'Solar',
  },
  solar: {
    badges: {
      'market-tooltip': 'Data is shown for Hungary in the Europe/Budapest market time zone.',
    },
    description: 'Forecast and actual production visualization will appear here.',
    freshness: {
      badge: 'Actual delayed by {{ minutes }} min',
      message:
        'The latest actual interval ended at {{ time }}. ENTSO-E has not published newer actual data yet.',
      'importer-delayed-badge': 'Import delayed',
      'importer-delayed-message':
        'The import service is delayed. Its last successful solar poll was at {{ time }}.',
      'importer-offline-badge': 'Importer offline',
      'importer-offline-message':
        'The import service is not updating data. Its last successful solar poll was at {{ time }}.',
      'unknown-time': 'an unknown time',
    },
    metrics: {
      interval: 'Interval',
    },
    series: {
      actual: 'Actual generation',
      forecast: 'Day-ahead forecast',
    },
    title: 'Solar production',
  },
};

const CS = {
  app: {
    home: 'Domovská stránka Power Market Dashboard',
    language: {
      'switch-to-cs': 'Přepnout do češtiny',
      'switch-to-en': 'Přepnout do angličtiny',
    },
    navigation: {
      balancing: 'Regulační energie',
      open: 'Otevřít navigaci',
      primary: 'Hlavní navigace',
      solar: 'Solární výroba',
    },
    'scroll-top': 'Posunout nahoru',
    theme: {
      'switch-to-dark': 'Přepnout na tmavý motiv',
      'switch-to-light': 'Přepnout na světlý motiv',
    },
  },
  'app-update': {
    confirm: 'Aktualizovat',
    description: 'Načtěte aplikaci znovu a použijte nejnovější verzi.',
    dismiss: 'Teď ne',
    title: 'Je dostupná nová verze',
  },
  balancing: {
    badges: {
      'source-tooltip': 'Data pro maďarský trh pocházejí z platformy ENTSO-E.',
    },
    description: 'Zde bude zobrazena vizualizace žebříčku nabídek regulační energie.',
    title: 'Žebříček nabídek regulační energie',
  },
  market: {
    'badge-tooltips': {
      complete: 'Jsou přítomné všechny očekávané záznamy.',
      connection: {
        connecting: 'Připojování pro automatické aktualizace dat.',
        delayed: 'Zdrojová data nebo aktualizace jsou opožděné.',
        live: 'Živé aktualizace jsou připojené.',
        offline: 'Živé aktualizace nejsou dostupné.',
      },
      incomplete: 'Některé očekávané záznamy chybí.',
    },
    complete: 'Kompletní',
    connecting: 'Připojuji živé aktualizace',
    delayed: 'Data mají zpoždění',
    incomplete: 'Neúplné',
    live: 'Živě',
    offline: 'Živé aktualizace nejsou dostupné',
  },
  'not-found': {
    back: 'Zpět na dashboard',
    description: 'Hledaná stránka neexistuje nebo byla přesunuta.',
    title: 'Stránka nenalezena',
  },
  routes: {
    balancing: 'Regulační energie',
    'not-found': 'Stránka nenalezena',
    solar: 'Solární výroba',
  },
  solar: {
    badges: {
      'market-tooltip': 'Data jsou zobrazena pro Maďarsko v tržním časovém pásmu Europe/Budapest.',
    },
    description: 'Zde bude zobrazena vizualizace předpovědi a skutečné výroby.',
    freshness: {
      badge: 'Skutečnost zpožděna o {{ minutes }} min',
      message:
        'Poslední skutečný interval skončil ve {{ time }}. ENTSO-E zatím novější data nezveřejnilo.',
      'importer-delayed-badge': 'Import je zpožděný',
      'importer-delayed-message':
        'Importní služba je zpožděná. Poslední úspěšný poll solárních dat proběhl {{ time }}.',
      'importer-offline-badge': 'Importér je offline',
      'importer-offline-message':
        'Importní služba neaktualizuje data. Poslední úspěšný poll solárních dat proběhl {{ time }}.',
      'unknown-time': 'v neznámý čas',
    },
    metrics: {
      interval: 'Interval',
    },
    series: {
      actual: 'Skutečná výroba',
      forecast: 'Day-ahead predikce',
    },
    title: 'Solární výroba',
  },
};

export const translocoTestingModule = () =>
  TranslocoTestingModule.forRoot({
    langs: { cs: CS, en: EN },
    preloadLangs: true,
    translocoConfig: {
      availableLangs: ['en', 'cs'],
      defaultLang: 'en',
      reRenderOnLangChange: true,
    },
  });
