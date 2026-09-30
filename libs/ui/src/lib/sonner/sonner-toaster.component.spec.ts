import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { NgxSonnerToaster } from 'ngx-sonner';

import { UI_OVERLAY_Z_INDEX } from '../helpers/overlay-layers';
import { SonnerToasterRegistry } from './sonner-toaster-registry';
import { SonnerToasterComponent } from './sonner-toaster.component';
import { SONNER_THEME } from './sonner.provider';

describe('SonnerToasterComponent', () => {
  const originalMatchMedia = window.matchMedia;
  let fixture: ComponentFixture<SonnerToasterComponent>;
  let component: SonnerToasterComponent;
  let registry: {
    register: ReturnType<typeof vi.fn>;
    unregister: ReturnType<typeof vi.fn>;
  };

  beforeAll(() => {
    window.matchMedia = vi.fn(
      (query: string): MediaQueryList =>
        ({
          addEventListener: vi.fn(),
          addListener: vi.fn(),
          dispatchEvent: vi.fn(),
          matches: false,
          media: query,
          onchange: null,
          removeEventListener: vi.fn(),
          removeListener: vi.fn(),
        }) as unknown as MediaQueryList,
    );
  });

  afterAll(() => {
    window.matchMedia = originalMatchMedia;
  });

  beforeEach(async () => {
    registry = {
      register: vi.fn(),
      unregister: vi.fn(),
    };
    await TestBed.configureTestingModule({
      imports: [SonnerToasterComponent],
      providers: [
        { provide: SONNER_THEME, useValue: signal('dark') },
        { provide: SonnerToasterRegistry, useValue: registry },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SonnerToasterComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should register on creation and unregister on destruction', () => {
    expect(registry.register).toHaveBeenCalledOnce();

    fixture.destroy();

    expect(registry.unregister).toHaveBeenCalledOnce();
  });

  it('should use the provided theme when no explicit theme is set', () => {
    expect(component.resolvedTheme()).toBe('dark');
    expect(toaster().theme()).toBe('dark');
  });

  it('should prefer an explicit theme and forward updated inputs', async () => {
    fixture.componentRef.setInput('theme', 'light');
    fixture.componentRef.setInput('position', 'top-center');
    fixture.componentRef.setInput('duration', 2500);
    fixture.componentRef.setInput('visibleToasts', 5);
    fixture.componentRef.setInput('richColors', false);
    fixture.componentRef.setInput('expand', true);
    fixture.componentRef.setInput('closeButton', false);
    fixture.componentRef.setInput('invert', true);
    fixture.componentRef.setInput('dir', 'rtl');
    fixture.componentRef.setInput('offset', '2rem');
    fixture.componentRef.setInput('hotKey', ['ctrlKey', 'KeyN']);
    await fixture.whenStable();

    const child = toaster();
    expect(component.resolvedTheme()).toBe('light');
    expect(child.theme()).toBe('light');
    expect(child.position()).toBe('top-center');
    expect(child.duration()).toBe(2500);
    expect(child.visibleToasts()).toBe(5);
    expect(child.richColors()).toBe(false);
    expect(child.expand()).toBe(true);
    expect(child.closeButton()).toBe(false);
    expect(child.invert()).toBe(true);
    expect(child.dir()).toBe('rtl');
    expect(child.offset()).toBe('2rem');
    expect(child.hotKey()).toEqual(['ctrlKey', 'KeyN']);
  });

  it('should apply the overlay z-index and Sonner theme variables', () => {
    expect(component.toasterStyle()).toEqual(
      expect.objectContaining({
        'z-index': `${UI_OVERLAY_Z_INDEX.toast}`,
        '--ngx-sonner-border-radius': '0.5rem',
        '--ngx-sonner-toast-success-background': 'var(--app-success-100)',
        '--ngx-sonner-toast-error-background': 'var(--app-danger-100)',
      }),
    );
  });

  it('should merge custom styles over defaults', async () => {
    fixture.componentRef.setInput('zIndex', 123);
    fixture.componentRef.setInput('style', {
      '--ngx-sonner-border-radius': '1rem',
      color: 'red',
    });
    await fixture.whenStable();

    const style: Record<string, string> = component.toasterStyle();
    expect(style['z-index']).toBe('123');
    expect(style['--ngx-sonner-border-radius']).toBe('1rem');
    expect(style['color']).toBe('red');
    expect(toaster()._style()).toEqual(style);
  });

  it('should fall back to the system theme without a provider', async () => {
    fixture.destroy();
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [SonnerToasterComponent],
      providers: [{ provide: SonnerToasterRegistry, useValue: registry }],
    }).compileComponents();
    const fallbackFixture = TestBed.createComponent(SonnerToasterComponent);
    await fallbackFixture.whenStable();

    expect(fallbackFixture.componentInstance.resolvedTheme()).toBe('system');
  });

  function toaster(): NgxSonnerToaster {
    return fixture.debugElement.query(By.directive(NgxSonnerToaster))
      .componentInstance;
  }
});
