import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  FormField,
  ValidationError,
  emailError,
  form,
  hidden,
  maxDateError,
  maxError,
  maxLengthError,
  minDateError,
  minError,
  minLength,
  minLengthError,
  pattern,
  patternError,
  required,
  requiredError,
  validate,
} from '@angular/forms/signals';
import { By } from '@angular/platform-browser';

import { InputDate } from '../../../input/components/input-date/input-date';
import { FormItem } from './form-item';

@Component({
  imports: [FormField, FormItem],
  template: `
    <ui-form-item hintText="Helpful hint" messageId="name-message">
      <input [formField]="fields.name" />
    </ui-form-item>
  `,
})
class ValidationHost {
  readonly model = signal({ name: '' });
  readonly fields = form(this.model, (schema) => {
    required(schema.name);
    minLength(schema.name, 3);
    pattern(schema.name, /^z+$/);
  });
}

@Component({
  imports: [FormField, FormItem],
  template: `
    <ui-form-item hintText="Fallback hint">
      <input [formField]="fields.value" />
    </ui-form-item>
  `,
})
class FallbackHost {
  readonly model = signal({ value: 'invalid' });
  readonly validationError = signal<ValidationError.WithoutFieldTree | undefined>(requiredError());
  readonly fields = form(this.model, (schema) => {
    validate(schema.value, () => this.validationError());
  });
}

@Component({
  imports: [FormField, FormItem],
  template: `
    @if (!fields.value().hidden()) {
      <ui-form-item>
        <input [formField]="fields.value" />
      </ui-form-item>
    }
  `,
})
class HiddenHost {
  readonly model = signal({ value: '' });
  readonly hideField = signal(false);
  readonly fields = form(this.model, (schema) => {
    hidden(schema.value, { when: () => this.hideField() });
  });
}

@Component({
  imports: [FormField, FormItem, InputDate],
  template: `
    <ui-form-item hintText="Your display name">
      <ui-input-date [formField]="fields.name" />
    </ui-form-item>
  `,
})
class CustomControlHost {
  readonly model = signal({ name: '' });
  readonly fields = form(this.model, (schema) => required(schema.name));
}

const getFormItem = (fixture: ReturnType<typeof TestBed.createComponent>): FormItem =>
  fixture.debugElement.query(By.directive(FormItem)).componentInstance as FormItem;

describe('FormItem', () => {
  it('renders safely before a projected form field query is available', async () => {
    const fixture = TestBed.createComponent(FormItem);
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).hidden).toBe(false);
    expect(fixture.componentInstance.showErrors()).toBe(false);
    expect(fixture.componentInstance.firstError()).toBeUndefined();
    expect(fixture.componentInstance.required()).toBe(false);
  });

  it('replaces a hint with the first touched error and restores it when valid', async () => {
    const fixture = TestBed.createComponent(ValidationHost);
    await fixture.whenStable();
    const formItem = getFormItem(fixture);
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;

    expect(fixture.nativeElement.textContent).toContain('Helpful hint');
    expect(fixture.nativeElement.querySelector('#name-message')?.textContent).toContain(
      'Helpful hint',
    );
    expect(formItem.showErrors()).toBe(false);

    input.dispatchEvent(new Event('blur'));
    await fixture.whenStable();

    expect(formItem.showErrors()).toBe(true);
    expect(formItem.firstError()?.kind).toBe('required');
    expect(formItem.errorMessage()).toBe('This field is required');
    expect(fixture.nativeElement.textContent).not.toContain('Helpful hint');
    expect(fixture.nativeElement.querySelector('#name-message')?.textContent).toContain(
      'This field is required',
    );

    input.value = 'a';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(formItem.firstError()?.kind).toBe('minLength');
    expect(formItem.errorMessage()).toBe('The length should be at least 3 characters');

    input.value = 'zzz';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(formItem.showErrors()).toBe(false);
    expect(formItem.errorMessage()).toBeUndefined();
    expect(fixture.nativeElement.textContent).toContain('Helpful hint');
  });

  it('prefers validator messages and supplies every built-in fallback', async () => {
    const fixture = TestBed.createComponent(FallbackHost);
    await fixture.whenStable();
    const formItem = getFormItem(fixture);
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.dispatchEvent(new Event('blur'));
    await fixture.whenStable();

    const cases: [ValidationError.WithoutFieldTree, string][] = [
      [requiredError(), 'This field is required'],
      [emailError(), 'Enter a valid email address'],
      [patternError(/^valid$/), 'Value has an invalid format'],
      [minError(3), 'Minimum value is 3'],
      [maxError(9), 'Maximum value is 9'],
      [minDateError(new Date('2026-01-02T00:00:00.000Z')), 'Minimum date is 2026-01-02'],
      [maxDateError(new Date('2026-12-31T00:00:00.000Z')), 'Maximum date is 2026-12-31'],
      [minLengthError(4), 'The length should be at least 4 characters'],
      [maxLengthError(8), 'The length should be at most 8 characters'],
      [{ kind: 'parse' }, 'Enter a valid value'],
      [{ kind: 'server' }, 'Invalid value'],
    ];

    for (const [error, expected] of cases) {
      fixture.componentInstance.validationError.set(error);
      await fixture.whenStable();
      expect(formItem.errorMessage()).toBe(expected);
    }

    fixture.componentInstance.validationError.set({
      kind: 'server',
      message: 'The server rejected this value',
    });
    await fixture.whenStable();
    expect(formItem.errorMessage()).toBe('The server rejected this value');

    fixture.componentInstance.validationError.set(undefined);
    await fixture.whenStable();
    expect(formItem.showErrors()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Fallback hint');
  });

  it('removes the complete wrapper when its signal field is hidden', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fixture = TestBed.createComponent(HiddenHost);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('ui-form-item')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('input')).not.toBeNull();

    fixture.componentInstance.hideField.set(true);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('ui-form-item')).toBeNull();
    expect(fixture.nativeElement.querySelector('input')).toBeNull();

    fixture.componentInstance.hideField.set(false);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('ui-form-item')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('input')).not.toBeNull();
    expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('NG01916'));
    warn.mockRestore();
  });

  it('integrates with existing signal-form custom controls', async () => {
    const fixture = TestBed.createComponent(CustomControlHost);
    await fixture.whenStable();
    const formItem = getFormItem(fixture);
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;

    input.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
    expect(formItem.showErrors()).toBe(true);
    expect(formItem.errorMessage()).toBe('This field is required');

    input.value = '2026-09-30';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(fixture.componentInstance.model().name).toBe('2026-09-30');
    expect(formItem.showErrors()).toBe(false);
  });
});
