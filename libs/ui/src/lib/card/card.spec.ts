import { TestBed } from '@angular/core/testing';

import { CardContent, CardTitle } from './card';

describe('card primitives', () => {
  it('applies base and compact padding', async () => {
    const fixture = TestBed.createComponent(CardContent);
    await fixture.whenStable();
    expect(fixture.nativeElement.classList).toContain('px-4');

    fixture.componentRef.setInput('size', 'sm');
    await fixture.whenStable();
    expect(fixture.nativeElement.classList).toContain('px-3');
    expect(fixture.nativeElement.classList).not.toContain('px-4');
  });

  it('exposes an accessible heading level', async () => {
    const fixture = TestBed.createComponent(CardTitle);
    fixture.componentRef.setInput('level', 3);
    await fixture.whenStable();

    expect(fixture.nativeElement.getAttribute('role')).toBe('heading');
    expect(fixture.nativeElement.getAttribute('aria-level')).toBe('3');
  });
});
