import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { ButtonSize } from '../../button.styles';
import { ButtonIcon } from './button-icon';

const sizeClasses: Record<ButtonSize, string> = {
  xs: 'size-7',
  sm: 'size-9',
  base: 'size-10',
  lg: 'size-12',
  xl: 'size-14',
};

@Component({
  imports: [ButtonIcon],
  template: `
    <a ui-button-icon aria-label="Create project" href="/create" rounded="all" [withBorder]="true">
      <span data-testid="icon">+</span>
    </a>
    <button ui-button-icon aria-label="Disabled action" type="button" [disabled]="true">×</button>
  `,
})
class ButtonIconHost {}

describe('ButtonIcon', () => {
  it.each(Object.entries(sizeClasses) as [ButtonSize, string][])(
    'renders the %s size as a centered square',
    async (size, sizeClass) => {
      const fixture = TestBed.createComponent(ButtonIcon);
      fixture.componentRef.setInput('size', size);
      await fixture.whenStable();

      const element = fixture.nativeElement as HTMLElement;
      expect(element.classList).toContain(sizeClass);
      expect(element.classList).toContain('aspect-square');
      expect(element.classList).toContain('inline-flex');
      expect(element.classList).toContain('items-center');
      expect(element.classList).toContain('justify-center');
      expect(element.classList).toContain('p-0');
    },
  );

  it('supports projected content and both anchor and button hosts', async () => {
    const fixture = TestBed.createComponent(ButtonIconHost);
    await fixture.whenStable();

    const elements = fixture.debugElement.queryAll(By.directive(ButtonIcon));
    const anchor = elements[0]?.nativeElement as HTMLAnchorElement;
    const button = elements[1]?.nativeElement as HTMLButtonElement;

    expect(elements).toHaveLength(2);
    expect(anchor.querySelector('[data-testid="icon"]')?.textContent).toBe('+');
    expect(anchor.classList).toContain('size-10');
    expect(anchor.classList).toContain('border');
    expect(anchor.classList).toContain('rounded-lg');
    expect(button.hasAttribute('disabled')).toBe(true);
    expect(button.classList).toContain('pointer-events-none');
  });
});
