import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { translocoTestingModule } from '../transloco-testing';
import { NotFoundPage } from './not-found-page';

describe('NotFoundPage', () => {
  let component: NotFoundPage;
  let fixture: ComponentFixture<NotFoundPage>;

  beforeEach(async () => {
    document.head.querySelector('meta[name="robots"]')?.remove();
    await TestBed.configureTestingModule({
      imports: [NotFoundPage, translocoTestingModule()],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(NotFoundPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => {
    fixture.destroy();
    document.head.querySelector('meta[name="robots"]')?.remove();
  });

  it('renders the not-found message, landscape logo, and home link', () => {
    const host = fixture.nativeElement as HTMLElement;
    const logo = host.querySelector('app-logo');
    const landscape = logo?.querySelector<SVGElement>('[data-logo="landscape"]');
    const heading = host.querySelector('h1');
    const link = host.querySelector('a');

    expect(component).toBeTruthy();
    expect(logo).not.toBeNull();
    expect(logo?.querySelector('[data-logo="icon"]')).toBeNull();
    expect(landscape).not.toBeNull();
    expect(landscape?.classList).not.toContain('hidden');
    expect(heading?.textContent?.trim()).toBe('Page not found');
    expect(host.textContent).toContain(
      'The page you’re looking for doesn’t exist or may have moved.',
    );
    expect(link?.textContent?.trim()).toBe('Back to dashboard');
    expect(link?.getAttribute('href')).toBe('/');
    expect(link?.classList).toContain('border');
    expect(link?.classList).toContain('border-primary-400');
  });

  it('adds robots metadata while active and removes it on destroy', () => {
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'noindex, nofollow',
    );

    fixture.destroy();

    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
  });
});
