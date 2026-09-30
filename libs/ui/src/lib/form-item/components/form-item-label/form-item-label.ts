import { NgTemplateOutlet } from '@angular/common';
import { Component, TemplateRef, booleanAttribute, computed, inject, input } from '@angular/core';

import { FormItem } from '../form-item/form-item';

const optionalBooleanAttribute = (value: unknown): boolean | undefined =>
  value === undefined || value === null ? undefined : booleanAttribute(value);

@Component({
  selector: 'label[ui-form-item-label]',
  imports: [NgTemplateOutlet],
  templateUrl: './form-item-label.html',
  host: {
    '[class.sr-only]': 'srOnly()',
  },
})
export class FormItemLabel {
  private readonly formItem = inject(FormItem);

  public readonly required = input<boolean | undefined, unknown>(undefined, {
    transform: optionalBooleanAttribute,
  });
  public readonly srOnly = input(false, { transform: booleanAttribute });
  public readonly templateRef = input<TemplateRef<void>>();
  public readonly showErrors = this.formItem.showErrors;
  protected readonly isRequired = computed(() => this.required() ?? this.formItem.required());
}
