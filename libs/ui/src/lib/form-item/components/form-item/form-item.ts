import { Component, computed, contentChild, inject, input } from '@angular/core';
import { FormField, REQUIRED, ValidationError } from '@angular/forms/signals';

import { UI_I18N, type UiI18n } from '../../../helpers/public-api';
import { FormItemMessage } from '../form-item-message/form-item-message';

const errorNumber = (
  error: ValidationError.WithFieldTree,
  property: string,
): number | undefined => {
  const value: unknown = Reflect.get(error, property);
  return typeof value === 'number' ? value : undefined;
};

const errorDate = (error: ValidationError.WithFieldTree, property: string): Date | undefined => {
  const value: unknown = Reflect.get(error, property);
  return value instanceof Date ? value : undefined;
};

const formatDate = (date: Date | undefined): string | undefined => date?.toISOString().slice(0, 10);

const errorFallback = (
  error: ValidationError.WithFieldTree,
  messages: UiI18n['validation'],
): string => {
  switch (error.kind) {
    case 'required':
      return messages.required;
    case 'email':
      return messages.email;
    case 'pattern':
      return messages.pattern;
    case 'min':
      return messages.minimum(errorNumber(error, 'min'));
    case 'max':
      return messages.maximum(errorNumber(error, 'max'));
    case 'minDate':
      return messages.minimumDate(formatDate(errorDate(error, 'minDate')));
    case 'maxDate':
      return messages.maximumDate(formatDate(errorDate(error, 'maxDate')));
    case 'minLength':
      return messages.minimumLength(errorNumber(error, 'minLength'));
    case 'maxLength':
      return messages.maximumLength(errorNumber(error, 'maxLength'));
    case 'parse':
      return messages.parse;
    default:
      return messages.invalid;
  }
};

@Component({
  selector: 'ui-form-item',
  imports: [FormItemMessage],
  templateUrl: './form-item.html',
  host: {
    class: 'flex flex-col gap-1.5',
  },
})
export class FormItem {
  private readonly i18n = inject(UI_I18N);
  private readonly signalFormField = contentChild(FormField);
  private readonly state = computed(() => this.signalFormField()?.state());

  public readonly hintText = input<string>();
  public readonly messageId = input('');
  public readonly showErrors = computed(() => {
    const state = this.state();
    return Boolean(state?.invalid() && state.touched());
  });
  public readonly firstError = computed(() => this.signalFormField()?.errors()[0]);
  public readonly errorMessage = computed(() => {
    const error = this.firstError();
    return error ? (error.message ?? errorFallback(error, this.i18n().validation)) : undefined;
  });
  public readonly required = computed(() => this.state()?.metadata(REQUIRED) ?? false);
}
