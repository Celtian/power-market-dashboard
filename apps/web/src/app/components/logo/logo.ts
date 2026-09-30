import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type LogoType = 'responsive' | 'landscape';

@Component({
  selector: 'app-logo',
  imports: [],
  templateUrl: './logo.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-hidden': 'true',
    class: 'flex w-fit items-center',
  },
})
export class Logo {
  public readonly logoType = input.required<LogoType>();
}
