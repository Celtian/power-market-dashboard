import { Combobox } from '@angular/aria/combobox';
import { OverlayContainer } from '@angular/cdk/overlay';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { InputSelect } from './input-select';
import { InputSelectOptionContext } from './input-select-option-context';
import { InputSelectOption } from './types';

const options: readonly InputSelectOption<number, { handle: string }>[] = [
  {
    accessibleLabel: 'Ada, first programmer',
    description: 'First programmer',
    label: 'Ada',
    value: 1,
    extra: { handle: '@ada' },
  },
  { label: 'Grace', value: 2, disabled: true, extra: { handle: '@grace' } },
  { label: 'Linus', value: 3, extra: { handle: '@linus' } },
];

@Component({
  imports: [InputSelect, InputSelectOptionContext],
  template: `
    <ui-input-select [value]="1" [options]="options">
      <ng-template let-option [uiInputSelectOptionContext]="options">
        <strong>{{ option.label }} {{ option.extra?.handle }}</strong>
      </ng-template>
    </ui-input-select>
  `,
})
class TemplateHost {
  protected readonly options = options;
}

describe('InputSelect', () => {
  let overlayContainer: HTMLElement;

  beforeEach(() => {
    overlayContainer = TestBed.inject(OverlayContainer).getContainerElement();
  });

  afterEach(() => overlayContainer.replaceChildren());

  it('renders and selects enabled values', async () => {
    const fixture = TestBed.createComponent(InputSelect<number>);
    fixture.componentRef.setInput('options', options);
    fixture.componentRef.setInput('value', 1);
    fixture.autoDetectChanges();
    await fixture.whenStable();

    const trigger = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    const combobox = fixture.debugElement.query(By.directive(Combobox)).injector.get(Combobox);
    expect(trigger.textContent).toContain('Ada');
    expect(trigger.textContent).not.toContain('First programmer');

    trigger.click();
    await fixture.whenStable();
    const firstOption = overlayContainer.querySelector<HTMLElement>('[ngOption]');
    expect(firstOption?.textContent).toContain('First programmer');
    expect(firstOption?.getAttribute('aria-label')).toBe('Ada, first programmer');

    fixture.componentInstance.onValuesChange([3], combobox);
    await fixture.whenStable();
    expect(fixture.componentInstance.value()).toBe(3);
    expect(trigger.textContent).toContain('Linus');
    expect(document.activeElement).toBe(trigger);

    fixture.componentInstance.onValuesChange([2], combobox);
    expect(fixture.componentInstance.value()).toBe(3);
  });

  it('renders typed option templates and disabled option state', async () => {
    const fixture = TestBed.createComponent(TemplateHost);
    fixture.autoDetectChanges();
    await fixture.whenStable();

    const trigger = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(trigger.textContent).toContain('Ada @ada');
    trigger.click();
    await fixture.whenStable();

    expect(overlayContainer.textContent).toContain('Linus @linus');
    expect(
      overlayContainer.querySelectorAll<HTMLElement>('[ngOption]')[1].getAttribute('aria-disabled'),
    ).toBe('true');
    const checkIcons = overlayContainer.querySelectorAll<HTMLElement>('[data-option-check]');
    expect(checkIcons).toHaveLength(1);
    expect(checkIcons[0].closest('[ngOption]')?.getAttribute('aria-selected')).toBe('true');
  });

  it('handles validation, touch, readonly, hidden state, and focus', async () => {
    const fixture = TestBed.createComponent(InputSelect<number>);
    fixture.componentRef.setInput('options', options);
    fixture.componentRef.setInput('value', 1);
    fixture.componentRef.setInput('labelId', 'maintainer');
    fixture.componentRef.setInput('ariaDescribedBy', 'maintainer-help');
    fixture.componentRef.setInput('required', true);
    fixture.componentRef.setInput('invalid', true);
    fixture.autoDetectChanges();
    let touchCount = 0;
    fixture.componentInstance.touch.subscribe(() => touchCount++);
    await fixture.whenStable();

    const trigger = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(trigger.id).toBe('maintainer');
    expect(trigger.getAttribute('aria-describedby')).toBe('maintainer-help');
    expect(trigger.getAttribute('aria-invalid')).toBe('false');
    expect(trigger.getAttribute('aria-required')).toBe('true');

    trigger.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
    expect(trigger.getAttribute('aria-invalid')).toBe('true');
    expect(touchCount).toBe(1);

    fixture.componentInstance.focus();
    expect(document.activeElement).toBe(trigger);

    fixture.componentRef.setInput('readonly', true);
    fixture.componentRef.setInput('hidden', true);
    await fixture.whenStable();
    expect(trigger.disabled).toBe(true);
    expect(trigger.getAttribute('aria-readonly')).toBe('true');
    expect((fixture.nativeElement as HTMLElement).hidden).toBe(true);
  });
});
