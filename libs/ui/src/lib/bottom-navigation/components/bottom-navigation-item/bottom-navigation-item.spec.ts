import { Component, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, RouterLink, provideRouter } from '@angular/router';

import { BottomNavigationItem } from './bottom-navigation-item';

@Component({
  template: '',
})
class EmptyRoute {}

@Component({
  imports: [BottomNavigationItem, RouterLink],
  template: `
    <a ui-bottom-navigation-item ariaCurrentWhenActive="page" routerLink="/target">
      <span>Target</span>
    </a>
  `,
})
class TestHost {
  readonly item = viewChild.required(BottomNavigationItem);
}

describe('BottomNavigationItem', () => {
  let fixture: ComponentFixture<TestHost>;
  let host: TestHost;
  let item: HTMLAnchorElement;
  let router: Router;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [TestHost],
      providers: [
        provideRouter([
          { path: 'other', component: EmptyRoute },
          { path: 'target', component: EmptyRoute },
        ]),
      ],
    });

    fixture = TestBed.createComponent(TestHost);
    host = fixture.componentInstance;
    router = TestBed.inject(Router);
    await router.navigateByUrl('/other');
    await fixture.whenStable();
    item = fixture.nativeElement.querySelector('a[ui-bottom-navigation-item]');
  });

  it('preserves native link behavior and projected content', () => {
    expect(host.item()).toBeTruthy();
    expect(item.textContent?.trim()).toBe('Target');
    expect(item.getAttribute('href')).toBe('/target');
    expect(item.tabIndex).toBe(0);
  });

  it('applies the base item classes', () => {
    expect(item.classList).toContain('flex');
    expect(item.classList).toContain('flex-col');
    expect(item.classList).toContain('items-center');
    expect(item.classList).toContain('min-h-14');
    expect(item.classList).toContain('text-xs');
    expect(item.classList).not.toContain('text-2xs');
    expect(item.classList).toContain('outline-hidden');
    expect(item.classList).toContain('focus-visible:ring-2');
    expect(item.classList).toContain('focus-visible:ring-inset');
  });

  it('does not apply active classes while the router link is inactive', () => {
    expect(item.classList).not.toContain('bg-primary-400');
    expect(item.classList).not.toContain('dark:bg-secondary-900');
  });

  it('applies active classes when its router link becomes active', async () => {
    await router.navigateByUrl('/target');
    await fixture.whenStable();

    expect(item.classList).toContain('bg-primary-400');
    expect(item.classList).toContain('text-primary-contrast-400');
    expect(item.classList).toContain('dark:bg-secondary-900');
    expect(item.classList).toContain('dark:text-secondary-contrast-900');
    expect(item.getAttribute('aria-current')).toBe('page');
  });
});
