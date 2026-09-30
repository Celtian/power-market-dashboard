import { Directive, TemplateRef, inject, input } from '@angular/core';

import { InputSelectOption } from './types';

@Directive({
  selector: 'ng-template[uiInputSelectOptionContext]',
})
export class InputSelectOptionContext<T extends string | number = string, R = undefined> {
  public readonly options = input.required<readonly InputSelectOption<T, R>[]>({
    alias: 'uiInputSelectOptionContext',
  });

  public readonly templateRef =
    inject<TemplateRef<{ $implicit: InputSelectOption<T, R> }>>(TemplateRef);

  public static ngTemplateContextGuard<T extends string | number, R>(
    directive: InputSelectOptionContext<T, R>,
    context: unknown,
  ): context is { $implicit: InputSelectOption<T, R> } {
    void directive;
    void context;
    return true;
  }
}
