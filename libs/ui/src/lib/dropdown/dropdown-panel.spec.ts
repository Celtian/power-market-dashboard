import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { DropdownPanel } from './dropdown-panel';

@Component({
  imports: [DropdownPanel],
  template: `
    <section uiDropdownPanel class="p-3" aria-labelledby="panel-heading">
      <h2 id="panel-heading">Panel heading</h2>
    </section>
  `,
})
class TestDropdownPanel {}

describe('DropdownPanel', () => {
  it('applies accessible surface styling without imposing content padding', async () => {
    const fixture = TestBed.createComponent(TestDropdownPanel);
    await fixture.whenStable();
    const panel = fixture.nativeElement.querySelector('section') as HTMLElement;

    expect(panel.getAttribute('role')).toBe('region');
    expect(panel.getAttribute('aria-labelledby')).toBe('panel-heading');
    expect(panel.dataset['dropdownPanel']).toBe('true');
    expect(panel.classList).toContain('rounded-lg');
    expect(panel.classList).toContain('border-primary-400');
    expect(panel.classList).toContain('surface-200');
    expect(panel.classList).toContain('dark:surface-800');
    expect(panel.classList).toContain('shadow-lg');
    expect(panel.classList).toContain('overflow-visible');
    expect(panel.classList).toContain('p-3');
  });
});
