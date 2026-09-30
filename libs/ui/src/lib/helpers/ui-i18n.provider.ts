import {
  DestroyRef,
  InjectionToken,
  type Signal,
  inject,
  makeEnvironmentProviders,
  signal,
} from '@angular/core';

export interface UiI18n {
  background: {
    addColor: string;
    addGradient: string;
    balance: (start: string, end: string) => string;
    color: string;
    colorBalance: string;
    colorBalanceUnit: string;
    description: string;
    direction: string;
    endColor: string;
    empty: string;
    gradient: string;
    hideLayer: (type: string) => string;
    invalid: string;
    layerSettings: string;
    layers: string;
    moveLayerDown: (type: string) => string;
    moveLayerUp: (type: string) => string;
    opacity: (value: string) => string;
    position: (value: string) => string;
    preview: string;
    removeLayer: (type: string) => string;
    selectLayer: string;
    startColor: string;
    showLayer: (type: string) => string;
    solidColor: string;
    title: string;
    directions: { bottom: string; left: string; right: string; top: string };
  };
  borderRadius: {
    bottomLeft: string;
    bottomRight: string;
    description: string;
    preview: string;
    previewDescription: (values: {
      label: string;
      topLeft: string;
      topRight: string;
      bottomRight: string;
      bottomLeft: string;
    }) => string;
    title: string;
    topLeft: string;
    topRight: string;
  };
  calendar: {
    nextMonth: string;
    nextPeriod: string;
    nextYear: string;
    previousMonth: string;
    previousPeriod: string;
    previousYear: string;
  };
  carousel: {
    goToSlide: (slide: string) => string;
    label: string;
    next: string;
    previous: string;
    selectSlide: string;
    selectOption: string;
  };
  input: {
    clear: string;
    clearAutocomplete: string;
    clearSearch: string;
    copyColor: string;
    openDatePicker: string;
    datePlaceholder: string;
    noResults: string;
    removeSelection: (label: string) => string;
    search: string;
    select: string;
    selectOption: string;
    selectDate: string;
    transparent: string;
    useColor: string;
    useTransparentColor: string;
  };
  layout: {
    description: string;
    gap: (x: string, y: string) => string;
    gapX: string;
    gapY: string;
    paddingBottom: string;
    paddingLeft: string;
    paddingRight: string;
    paddingTop: string;
    preview: string;
    previewPaddingDescription: (values: {
      label: string;
      top: string;
      right: string;
      bottom: string;
      left: string;
    }) => string;
    previewDescription: (values: {
      label: string;
      top: string;
      right: string;
      bottom: string;
      left: string;
      gapX: string;
      gapY: string;
    }) => string;
    title: string;
  };
  modal: { close: string };
  navigation: { pageActions: string; table: string };
  playback: {
    end: string;
    label: string;
    next: string;
    pause: string;
    play: string;
    position: string;
    previous: string;
    start: string;
  };
  progress: { label: string; value: (value: string) => string };
  retry: string;
  save: string;
  cancel: string;
  reset: string;
}

export const DEFAULT_UI_I18N: UiI18n = {
  background: {
    addColor: 'Solid color',
    addGradient: 'Gradient',
    balance: (start, end) => `Start ${start} · End ${end}`,
    color: 'Color',
    colorBalance: 'Color balance',
    colorBalanceUnit: 'Color balance unit',
    description:
      'Build a background from topmost to bottommost layers, or remove all layers for transparency.',
    direction: 'Direction',
    endColor: 'End color',
    empty: 'The background is transparent. Add a layer to create a background.',
    gradient: 'Gradient',
    hideLayer: (type) => `Hide ${type} layer`,
    invalid: 'At least one visible layer must have opacity above 0%.',
    layerSettings: 'Layer settings',
    layers: 'Layers',
    moveLayerDown: (type) => `Move ${type} layer down`,
    moveLayerUp: (type) => `Move ${type} layer up`,
    opacity: (value) => `Opacity ${value}`,
    position: (value) => `Position ${value}`,
    preview: 'Background preview',
    removeLayer: (type) => `Remove ${type} layer`,
    selectLayer: 'Select a layer to edit it.',
    startColor: 'Start color',
    showLayer: (type) => `Show ${type} layer`,
    solidColor: 'Solid color',
    title: 'Background editor',
    directions: { bottom: 'Bottom', left: 'Left', right: 'Right', top: 'Top' },
  },
  borderRadius: {
    bottomLeft: 'Bottom left',
    bottomRight: 'Bottom right',
    description: 'Adjust each corner of the leaderboard bars.',
    preview: 'Live bar shape preview',
    previewDescription: ({
      label,
      topLeft,
      topRight,
      bottomRight,
      bottomLeft,
    }) =>
      `${label}: top left ${topLeft}px, top right ${topRight}px, bottom right ${bottomRight}px, bottom left ${bottomLeft}px.`,
    title: 'Bar border radius editor',
    topLeft: 'Top left',
    topRight: 'Top right',
  },
  calendar: {
    nextMonth: 'Next month',
    nextPeriod: 'Next period',
    nextYear: 'Next year',
    previousMonth: 'Previous month',
    previousPeriod: 'Previous period',
    previousYear: 'Previous year',
  },
  carousel: {
    goToSlide: (slide) => `Go to slide ${slide}`,
    label: 'Carousel',
    next: 'Next slide',
    previous: 'Previous slide',
    selectSlide: 'Select a slide to show',
    selectOption: 'Select an option',
  },
  input: {
    clear: 'Clear input',
    clearAutocomplete: 'Clear autocomplete',
    clearSearch: 'Clear search',
    copyColor: 'Copy color',
    openDatePicker: 'Open date picker',
    datePlaceholder: 'MM/DD/YYYY',
    noResults: 'No results found',
    removeSelection: (label) =>
      label ? `Remove ${label}` : 'Remove selection',
    search: 'Search…',
    select: 'Select',
    selectOption: 'Select an option',
    selectDate: 'Select date',
    transparent: 'Transparent',
    useColor: 'Use color',
    useTransparentColor: 'Use transparent color',
  },
  layout: {
    description: 'Adjust the spacing inside the visualization canvas.',
    gap: (x, y) => `Gap ${x} × ${y}`,
    gapX: 'Gap X',
    gapY: 'Gap Y',
    paddingBottom: 'Padding bottom',
    paddingLeft: 'Padding left',
    paddingRight: 'Padding right',
    paddingTop: 'Padding top',
    preview: 'Layout preview',
    previewPaddingDescription: ({ label, top, right, bottom, left }) =>
      `${label}: padding top ${top}px, right ${right}px, bottom ${bottom}px, left ${left}px.`,
    previewDescription: ({ label, top, right, bottom, left, gapX, gapY }) =>
      `${label}: padding top ${top}px, right ${right}px, bottom ${bottom}px, left ${left}px; horizontal gap ${gapX}px; vertical gap ${gapY}px.`,
    title: 'Layout editor',
  },
  modal: { close: 'Close' },
  navigation: { pageActions: 'Page actions', table: 'Table navigation' },
  playback: {
    end: 'Go to end',
    label: 'Playback controls',
    next: 'Show next',
    pause: 'Pause playback',
    play: 'Play',
    position: 'Playback position',
    previous: 'Show previous',
    start: 'Go to start',
  },
  progress: { label: 'Progress', value: (value) => value },
  retry: 'Retry',
  save: 'Save',
  cancel: 'Cancel',
  reset: 'Reset',
};

export type UiI18nCleanup = VoidFunction | { unsubscribe: VoidFunction } | void;
export type UiI18nFactory = (setI18n: (i18n: UiI18n) => void) => UiI18nCleanup;

export const UI_I18N = new InjectionToken<Signal<UiI18n>>('UI_I18N', {
  providedIn: 'root',
  factory: () => signal(DEFAULT_UI_I18N),
});

export const provideUiI18n = (i18nFactory?: UiI18nFactory) =>
  makeEnvironmentProviders([
    {
      provide: UI_I18N,
      useFactory: () => {
        const destroyRef = inject(DestroyRef);
        const i18n = signal(DEFAULT_UI_I18N);
        const cleanup = i18nFactory?.((value) => i18n.set(value));
        if (typeof cleanup === 'function') destroyRef.onDestroy(cleanup);
        else if (cleanup?.unsubscribe)
          destroyRef.onDestroy(() => cleanup.unsubscribe());
        return i18n;
      },
    },
  ]);
