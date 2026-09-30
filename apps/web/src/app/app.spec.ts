import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { BottomNavigation } from '@power-market-dashboard/ui';

import { App } from './app';
import { appRoutes } from './app.routes';

describe('App', () => {
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
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = '';
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(appRoutes)],
    }).compileComponents();
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
    expect(compiled.querySelector('header')?.textContent).toContain(
      'Power Market Dashboard',
    );
  });

  it('renders the fixed mobile navigation', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    const footer = compiled.querySelector<HTMLElement>('[ngxFixedFooter]');
    const links = compiled.querySelectorAll<HTMLAnchorElement>(
      'ui-bottom-navigation nav a',
    );

    expect(footer).not.toBeNull();
    expect(footer?.classList).toContain('sm:hidden');
    const navigation = fixture.debugElement.query(
      By.directive(BottomNavigation),
    ).componentInstance as BottomNavigation;
    expect(navigation.containerSelector()).toBe(
      '[data-bottom-navigation-container]',
    );
    expect(links).toHaveLength(2);
    expect(links[0].getAttribute('href')).toBe('/solar');
    expect(links[0].textContent).toContain('Solar');
    expect(links[0].querySelector('ng-icon')?.getAttribute('name')).toBe(
      'faSolidSun',
    );
    expect(links[1].getAttribute('href')).toBe('/balancing');
    expect(links[1].textContent).toContain('Balancing');
    expect(links[1].querySelector('ng-icon')?.getAttribute('name')).toBe(
      'faSolidScaleBalanced',
    );
    expect(compiled.querySelector('ui-sonner-toaster')).not.toBeNull();
  });

  it('marks the active module as the current page', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/solar');
    await fixture.whenStable();

    const mobileLinks = fixture.nativeElement.querySelectorAll(
      'ui-bottom-navigation nav a',
    ) as NodeListOf<HTMLAnchorElement>;
    const desktopLinks = fixture.nativeElement.querySelectorAll(
      '[data-desktop-navigation] a',
    ) as NodeListOf<HTMLAnchorElement>;
    expect(mobileLinks[0].getAttribute('aria-current')).toBe('page');
    expect(mobileLinks[1].hasAttribute('aria-current')).toBe(false);
    expect(desktopLinks[0].getAttribute('aria-current')).toBe('page');
    expect(desktopLinks[1].hasAttribute('aria-current')).toBe(false);

    await router.navigateByUrl('/balancing/ladder');
    await fixture.whenStable();

    expect(mobileLinks[0].hasAttribute('aria-current')).toBe(false);
    expect(mobileLinks[1].getAttribute('aria-current')).toBe('page');
    expect(desktopLinks[0].hasAttribute('aria-current')).toBe(false);
    expect(desktopLinks[1].getAttribute('aria-current')).toBe('page');
  });

  it('toggles between light and dark themes', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const button = fixture.nativeElement.querySelector(
      '[data-theme-toggle]',
    ) as HTMLButtonElement;

    expect(button.getAttribute('aria-label')).toBe('Switch to dark theme');
    const darkThemeIconPath = button.querySelector('path')?.getAttribute('d');
    expect(darkThemeIconPath).toBeTruthy();

    button.click();
    await fixture.whenStable();

    expect(button.getAttribute('aria-label')).toBe('Switch to light theme');
    expect(button.querySelector('path')?.getAttribute('d')).not.toBe(
      darkThemeIconPath,
    );
    expect(document.documentElement.classList).toContain('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
  });
});
