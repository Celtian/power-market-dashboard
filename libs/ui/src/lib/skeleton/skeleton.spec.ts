import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { Skeleton } from './skeleton';

describe('Skeleton', () => {
  let fixture: ComponentFixture<Skeleton>;
  let host: HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(Skeleton);
    await fixture.whenStable();
    host = fixture.nativeElement;
  });

  it('renders with the default rectangle, pulse animation, and dimensions', () => {
    expect(host.classList).toContain('block');
    expect(host.classList).toContain('surface-400');
    expect(host.classList).toContain('dark:surface-700');
    expect(host.classList).toContain('animate-pulse');
    expect(host.classList).toContain('rounded-lg');
    expect(host.style.width).toBe('100%');
    expect(host.style.height).toBe('1rem');
    expect(host.textContent).toBe('');
  });

  it('renders a circular skeleton', async () => {
    fixture.componentRef.setInput('shape', 'circle');
    await fixture.whenStable();

    expect(host.classList).toContain('rounded-full');
    expect(host.classList).not.toContain('rounded-lg');
  });

  it('disables the pulse animation', async () => {
    fixture.componentRef.setInput('animation', 'none');
    await fixture.whenStable();

    expect(host.classList).not.toContain('animate-pulse');
  });

  it('updates its dimensions', async () => {
    fixture.componentRef.setInput('width', '4rem');
    fixture.componentRef.setInput('height', '2.5rem');
    await fixture.whenStable();

    expect(host.style.width).toBe('4rem');
    expect(host.style.height).toBe('2.5rem');
  });
});
