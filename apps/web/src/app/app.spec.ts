import { OverlayContainer } from '@angular/cdk/overlay';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';

import { TranslocoService } from '@jsverse/transloco';
import { provideTranslocoLocale } from '@jsverse/transloco-locale';
import { NgxUpdateAppService } from 'ngx-update-app';

import { BottomNavigation, Tooltip } from '@power-market-dashboard/ui';

import { App } from './app';
import { appRoutes } from './app.routes';
import { translocoTestingModule } from './transloco-testing';

describe('App', () => {
  let checkForUpdates: ReturnType<typeof vi.fn>;

  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  beforeEach(async () => {
    checkForUpdates = vi.fn();
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = '';
    document.documentElement.lang = 'en';
    await TestBed.configureTestingModule({
      imports: [App, translocoTestingModule()],
      providers: [
        provideRouter(appRoutes),
        provideTranslocoLocale({
          defaultLocale: 'en-US',
          langToLocaleMapping: { cs: 'cs-CZ', en: 'en-US' },
        }),
        {
          provide: NgxUpdateAppService,
          useValue: { checkForUpdates },
        },
      ],
    }).compileComponents();
  });

  it('starts checking for application updates', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    expect(checkForUpdates).toHaveBeenCalledOnce();
  });

  it('renders the global header, main content, and footer', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const content = compiled.querySelector('[data-bottom-navigation-container]');

    expect(compiled.querySelector('header')).not.toBeNull();
    expect(content?.querySelector('main')).not.toBeNull();
    expect(content?.querySelector('footer')?.textContent).toContain(
      `${new Date().getFullYear()} Power Market Dashboard`,
    );
    const homeLink = compiled.querySelector<HTMLAnchorElement>('header a[href="/solar"]');
    expect(homeLink?.getAttribute('aria-label')).toBe('Power Market Dashboard home');
    const logo = homeLink?.querySelector('app-logo');
    expect(logo).not.toBeNull();
    expect(logo?.querySelector('[data-logo="icon"]')).not.toBeNull();
    expect(logo?.querySelector('[data-logo="landscape"]')).not.toBeNull();
    expect(homeLink?.parentElement?.classList).toContain('flex');
    expect(homeLink?.parentElement?.classList).toContain('items-center');
    expect(homeLink?.classList).toContain('flex');
    expect(homeLink?.classList).toContain('h-14');
    expect(homeLink?.classList).toContain('items-center');
    expect(homeLink?.classList).toContain('px-2');
    expect(homeLink?.classList).toContain('hover:surface-400');
    expect(homeLink?.classList).toContain('dark:hover:surface-700');
  });

  it('renders the fixed mobile navigation', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    const footer = compiled.querySelector<HTMLElement>('[ngxFixedFooter]');
    const links = compiled.querySelectorAll<HTMLAnchorElement>('ui-bottom-navigation nav a');

    expect(footer).not.toBeNull();
    expect(footer?.classList).toContain('sm:hidden');
    const navigation = fixture.debugElement.query(By.directive(BottomNavigation))
      .componentInstance as BottomNavigation;
    expect(navigation.containerSelector()).toBe('[data-bottom-navigation-container]');
    expect(links).toHaveLength(2);
    expect(links[0].getAttribute('href')).toBe('/solar');
    expect(links[0].textContent).toContain('Solar');
    expect(links[0].querySelector('ng-icon')?.getAttribute('name')).toBe('faSolidSun');
    expect(links[1].getAttribute('href')).toBe('/balancing');
    expect(links[1].textContent).toContain('Balancing');
    expect(links[1].querySelector('ng-icon')?.getAttribute('name')).toBe('faSolidScaleBalanced');
    expect(compiled.querySelector('ui-sonner-toaster')).not.toBeNull();
  });

  it('renders an accessible scroll-to-top button above mobile navigation', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const button = fixture.nativeElement.querySelector('button[ngxScrollTop]') as HTMLButtonElement;

    expect(button).not.toBeNull();
    expect(button.getAttribute('aria-label')).toBe('Scroll up');
    expect(button.classList).toContain('bottom-[calc(4.5rem+env(safe-area-inset-bottom))]');
    expect(button.classList).toContain('sm:bottom-4');
    expect(button.querySelector('ng-icon')?.getAttribute('name')).toBe('faSolidChevronUp');
    expect(button.querySelector('ng-icon')?.getAttribute('aria-hidden')).toBe('true');

    TestBed.inject(TranslocoService).setActiveLang('cs');
    await fixture.whenStable();

    expect(button.getAttribute('aria-label')).toBe('Posunout nahoru');
  });

  it('renders desktop navigation in a dropdown and closes after navigation', async () => {
    const fixture = TestBed.createComponent(App);
    const overlayContainer = TestBed.inject(OverlayContainer).getContainerElement();
    await fixture.whenStable();
    const trigger = fixture.nativeElement.querySelector(
      '[data-header-navigation-trigger]',
    ) as HTMLButtonElement;

    expect(trigger.classList).toContain('hidden');
    expect(trigger.classList).toContain('sm:inline-flex');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    trigger.click();
    await fixture.whenStable();

    const links = overlayContainer.querySelectorAll<HTMLAnchorElement>(
      '#header-navigation-panel a',
    );
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(links).toHaveLength(2);
    expect(links[0].getAttribute('href')).toBe('/solar');
    expect(links[0].textContent).toContain('Solar');
    expect(links[0].querySelector('ng-icon')?.getAttribute('name')).toBe('faSolidSun');
    expect(links[0].querySelector('ng-icon')?.getAttribute('aria-hidden')).toBe('true');
    expect(links[1].getAttribute('href')).toBe('/balancing');
    expect(links[1].textContent).toContain('Balancing');
    expect(links[1].querySelector('ng-icon')?.getAttribute('name')).toBe('faSolidScaleBalanced');
    expect(links[1].querySelector('ng-icon')?.getAttribute('aria-hidden')).toBe('true');

    links[1].click();
    await fixture.whenStable();

    expect(overlayContainer.querySelector('#header-navigation-panel')).toBeNull();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('orders header actions and shows navigation only above mobile', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const actionButtons = fixture.nativeElement.querySelectorAll(
      'header button',
    ) as NodeListOf<HTMLButtonElement>;
    const navigation = fixture.debugElement.query(By.directive(BottomNavigation))
      .componentInstance as BottomNavigation;
    const fixedFooter = fixture.nativeElement.querySelector('[ngxFixedFooter]') as HTMLElement;

    expect(actionButtons).toHaveLength(3);
    expect(actionButtons[0].hasAttribute('data-language-toggle')).toBe(true);
    expect(actionButtons[1].hasAttribute('data-theme-toggle')).toBe(true);
    expect(actionButtons[2].hasAttribute('data-header-navigation-trigger')).toBe(true);
    expect(actionButtons[2].classList).toContain('hidden');
    expect(actionButtons[2].classList).toContain('sm:inline-flex');
    expect(navigation.mobileOnly()).toBe(true);
    expect(fixedFooter.classList).toContain('sm:hidden');
  });

  it('provides tooltips for the home link and header actions', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const tooltipElements = fixture.debugElement.queryAll(By.directive(Tooltip));
    const tooltips = tooltipElements.map((element) => element.injector.get(Tooltip));

    expect(tooltips).toHaveLength(4);
    expect(tooltips[0].target()).toBe('Power Market Dashboard home');
    expect(tooltips[0].tooltipPosition()).toEqual(['bottomRight', 'topRight']);
    expect(tooltips[1].target()).toBe('Switch to Czech');
    expect(tooltips[1].tooltipPosition()).toEqual(['bottomLeft', 'topLeft']);
    expect(tooltips[2].target()).toBe('Switch to light theme');
    expect(tooltips[2].tooltipPosition()).toEqual(['bottomLeft', 'topLeft']);
    expect(tooltipElements[0].nativeElement.hasAttribute('title')).toBe(false);
    expect(tooltips[3].target()).toBe('Open navigation');
    expect(tooltips[3].tooltipPosition()).toEqual(['bottomLeft', 'topLeft']);
    expect(tooltipElements[1].nativeElement.hasAttribute('title')).toBe(false);
    expect(tooltipElements[2].nativeElement.hasAttribute('title')).toBe(false);
    expect(tooltipElements[3].nativeElement.hasAttribute('title')).toBe(false);

    (tooltipElements[2].nativeElement as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(tooltips[2].target()).toBe('Switch to dark theme');
  });

  it('toggles the language and updates the flag, text, and document language', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const button = fixture.nativeElement.querySelector(
      '[data-language-toggle]',
    ) as HTMLButtonElement;

    expect(button.getAttribute('aria-label')).toBe('Switch to Czech');
    expect(button.querySelector('img')?.getAttribute('src')).toContain('/flags/20x15/gb.png');
    expect(document.documentElement.lang).toBe('en');

    button.click();
    await fixture.whenStable();

    expect(TestBed.inject(TranslocoService).getActiveLang()).toBe('cs');
    expect(button.getAttribute('aria-label')).toBe('Přepnout do angličtiny');
    expect(button.querySelector('img')?.getAttribute('src')).toContain('/flags/20x15/cz.png');
    expect(fixture.nativeElement.textContent).toContain('Solární výroba');
    expect(document.documentElement.lang).toBe('cs');
  });

  it('marks the active module as the current page', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    const overlayContainer = TestBed.inject(OverlayContainer).getContainerElement();
    await router.navigateByUrl('/solar');
    await fixture.whenStable();

    const trigger = fixture.nativeElement.querySelector(
      '[data-header-navigation-trigger]',
    ) as HTMLButtonElement;
    trigger.click();
    await fixture.whenStable();

    const mobileLinks = fixture.nativeElement.querySelectorAll(
      'ui-bottom-navigation nav a',
    ) as NodeListOf<HTMLAnchorElement>;
    const headerLinks = overlayContainer.querySelectorAll<HTMLAnchorElement>(
      '#header-navigation-panel a',
    ) as NodeListOf<HTMLAnchorElement>;
    expect(mobileLinks[0].getAttribute('aria-current')).toBe('page');
    expect(mobileLinks[1].hasAttribute('aria-current')).toBe(false);
    expect(headerLinks[0].getAttribute('aria-current')).toBe('page');
    expect(headerLinks[1].hasAttribute('aria-current')).toBe(false);

    await router.navigateByUrl('/balancing/ladder');
    await fixture.whenStable();

    expect(mobileLinks[0].hasAttribute('aria-current')).toBe(false);
    expect(mobileLinks[1].getAttribute('aria-current')).toBe('page');
    expect(headerLinks[0].hasAttribute('aria-current')).toBe(false);
    expect(headerLinks[1].getAttribute('aria-current')).toBe('page');
  });

  it('toggles between light and dark themes', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const button = fixture.nativeElement.querySelector('[data-theme-toggle]') as HTMLButtonElement;

    expect(button.getAttribute('aria-label')).toBe('Switch to light theme');
    const lightThemeIconPath = button.querySelector('path')?.getAttribute('d');
    expect(lightThemeIconPath).toBeTruthy();
    expect(document.documentElement.classList).toContain('dark');

    button.click();
    await fixture.whenStable();

    expect(button.getAttribute('aria-label')).toBe('Switch to dark theme');
    expect(button.querySelector('path')?.getAttribute('d')).not.toBe(lightThemeIconPath);
    expect(document.documentElement.classList).not.toContain('dark');
    expect(localStorage.getItem('theme')).toBe('light');
  });
});
