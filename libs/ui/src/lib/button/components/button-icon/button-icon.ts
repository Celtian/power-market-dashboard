import { Component, booleanAttribute, computed, input } from '@angular/core';

import { buildClasses } from '../../../helpers/tailwind';
import {
  ButtonColor,
  ButtonRadius,
  ButtonSize,
  buttonIconStyles,
} from '../../button.styles';

@Component({
  selector: 'button[ui-button-icon],a[ui-button-icon]',
  imports: [],
  templateUrl: './button-icon.html',
  host: {
    '[class]': 'twClasses()',
    '[attr.disabled]': 'disabled() || undefined',
  },
})
export class ButtonIcon {
  public readonly size = input<ButtonSize>();
  public readonly color = input<ButtonColor>('default');
  public readonly active = input(false, { transform: booleanAttribute });
  public readonly disabled = input(false, { transform: booleanAttribute });
  public readonly withBorder = input(false, { transform: booleanAttribute });
  public readonly rounded = input<ButtonRadius>('none');
  public readonly twClasses = computed(() =>
    buildClasses(
      buttonIconStyles({
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
