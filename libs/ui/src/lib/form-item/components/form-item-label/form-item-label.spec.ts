import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormField, form, required } from '@angular/forms/signals';

import { FormItem } from '../form-item/form-item';
import { FormItemLabel } from './form-item-label';

@Component({
  imports: [FormField, FormItem, FormItemLabel],
  template: `
    <ng-template #actions><button type="button">Help</button></ng-template>
    <ui-form-item>
      <label
        ui-form-item-label
        for="name"
        [required]="requiredOverride()"
        [srOnly]="srOnly()"
        [templateRef]="actions"
      >
        Name
      </label>
      <input id="name" [formField]="fields.name" />
    </ui-form-item>
  `,
})
class LabelHost {
  readonly model = signal({ name: '' });
  readonly requiredOverride = signal<boolean | undefined>(undefined);
  readonly srOnly = signal(false);
  readonly fields = form(this.model, (schema) => required(schema.name));
}

describe('FormItemLabel', () => {
  it('renders content, inferred required state, and a trailing template', async () => {
    const fixture = TestBed.createComponent(LabelHost);
    await fixture.whenStable();
    const label = fixture.nativeElement.querySelector('label') as HTMLLabelElement;

    expect(label.textContent).toContain('Name');
    expect(label.textContent).toContain('*');
    expect(label.querySelector('[aria-hidden="true"]')).not.toBeNull();
    expect(label.querySelector('button')?.textContent).toContain('Help');
  });

  it('supports required overrides and screen-reader-only styling', async () => {
    const fixture = TestBed.createComponent(LabelHost);
    await fixture.whenStable();
    const label = fixture.nativeElement.querySelector('label') as HTMLLabelElement;

    fixture.componentInstance.requiredOverride.set(false);
    fixture.componentInstance.srOnly.set(true);
    await fixture.whenStable();

    expect(label.textContent).not.toContain('*');
    expect(label.classList).toContain('sr-only');
  });

  it('reacts to the parent field error state', async () => {
    const fixture = TestBed.createComponent(LabelHost);
    await fixture.whenStable();
    const labelContent = fixture.nativeElement.querySelector('label > div') as HTMLDivElement;
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(labelContent.classList).not.toContain('text-danger-500');

    input.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
    expect(labelContent.classList).toContain('text-danger-500');
  });
});
