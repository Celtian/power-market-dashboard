import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Badge } from './badge';

@Component({
  imports: [Badge],
  template: '<span uiBadge color="green" weight="bold">Live</span>',
})
class BadgeHost {}

describe('Badge', () => {
  it('applies semantic status styling', async () => {
    const fixture = TestBed.createComponent(BadgeHost);
    await fixture.whenStable();

    const badge = fixture.nativeElement.querySelector('span') as HTMLElement;
    expect(badge.textContent).toContain('Live');
    expect(badge.classList).toContain('bg-green-100');
    expect(badge.classList).toContain('font-semibold');
  });
});
