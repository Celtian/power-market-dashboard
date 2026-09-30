import { TestBed } from '@angular/core/testing';

import { FormItemMessage } from './form-item-message';

describe('FormItemMessage', () => {
  it('renders the hint variant by default', async () => {
    const fixture = TestBed.createComponent(FormItemMessage);
    await fixture.whenStable();
    const message = fixture.nativeElement as HTMLElement;

    expect(message.classList).toContain('text-xs');
    expect(message.classList).not.toContain('text-danger-500');
    expect(message.hasAttribute('role')).toBe(false);
    expect(message.hasAttribute('aria-live')).toBe(false);
  });

  it('renders an accessible error variant', async () => {
    const fixture = TestBed.createComponent(FormItemMessage);
    fixture.componentRef.setInput('variant', 'error');
    await fixture.whenStable();
    const message = fixture.nativeElement as HTMLElement;

    expect(message.classList).toContain('text-danger-500');
    expect(message.getAttribute('role')).toBe('status');
    expect(message.getAttribute('aria-live')).toBe('polite');
  });
});
