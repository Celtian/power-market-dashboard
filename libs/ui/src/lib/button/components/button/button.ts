import { Component, booleanAttribute, computed, input } from '@angular/core';

import { buildClasses } from '../../../helpers/tailwind';
import {
  ButtonColor,
  ButtonRadius,
  ButtonSize,
  buttonStyles,
} from '../../button.styles';

export type {
  ButtonColor,
  ButtonRadius,
  ButtonSize,
} from '../../button.styles';

@Component({
  selector: 'button[ui-button],a[ui-button]',
  imports: [],
  templateUrl: './button.html',
  host: {
    '[class]': 'twClasses()',
    '[attr.disabled]': 'disabled() || undefined',
  },
})
export class Button {
  public readonly size = input<ButtonSize>();
  public readonly color = input<ButtonColor>('default');
  public readonly active = input(false, { transform: booleanAttribute });
  public readonly disabled = input(false, { transform: booleanAttribute });
  public readonly withBorder = input(false, { transform: booleanAttribute });
  public readonly rounded = input<ButtonRadius>('none');
  public readonly twClasses = computed(() =>
    buildClasses(
      buttonStyles({
        size: this.size(),
        color: this.color(),
        disabled: this.disabled(),
        active: this.active(),
        withBorder: this.withBorder(),
        rounded: this.rounded(),
      }),
    ),
  );
}
