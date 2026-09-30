import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Logo } from './logo';

describe('Logo', () => {
  let component: Logo;
  let fixture: ComponentFixture<Logo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Logo],
    }).compileComponents();

    fixture = TestBed.createComponent(Logo);
    component = fixture.componentInstance;
  });

  it('renders responsive compact and landscape variants', async () => {
    fixture.componentRef.setInput('logoType', 'responsive');
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const icon = host.querySelector<SVGElement>('[data-logo="icon"]');
    const landscape = host.querySelector<SVGElement>('[data-logo="landscape"]');
    const wordmark = landscape?.querySelector('[data-logo-wordmark]');

    expect(component).toBeTruthy();
    expect(host.getAttribute('aria-hidden')).toBe('true');
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
    expect(icon?.getAttribute('focusable')).toBe('false');
    expect(icon?.classList).toContain('sm:hidden');
    expect(landscape?.getAttribute('aria-hidden')).toBe('true');
    expect(landscape?.getAttribute('focusable')).toBe('false');
    expect(landscape?.classList).toContain('hidden');
    expect(landscape?.classList).toContain('sm:block');
    expect(wordmark?.getAttribute('fill')).toBe('currentColor');
  });

  it('always shows the complete landscape brand', async () => {
    fixture.componentRef.setInput('logoType', 'landscape');
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const landscape = host.querySelector<SVGElement>('[data-logo="landscape"]');

    expect(host.querySelector('[data-logo="icon"]')).toBeNull();
    expect(landscape).not.toBeNull();
    expect(landscape?.classList).not.toContain('hidden');
    expect(landscape?.classList).not.toContain('sm:block');
  });
});
