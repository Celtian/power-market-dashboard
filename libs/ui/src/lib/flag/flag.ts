import { NgOptimizedImage } from '@angular/common';
import { Component, computed, input } from '@angular/core';

import { type CountryCode, FLAGS, getFlagPath } from './flag-assets.generated';

export { type CountryCode, FLAGS, getFlagPath } from './flag-assets.generated';

export const isCountryCode = (value: unknown): value is CountryCode =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(FLAGS, value);

export type FlagSize = 'sm' | 'lg';

@Component({
  selector: 'ui-flag',
  imports: [NgOptimizedImage],
  templateUrl: './flag.html',
  host: {
    class: 'inline-flex shrink-0',
  },
})
export class Flag {
  public readonly countryCode = input.required<CountryCode>();
  public readonly countryName = input<string>();
  public readonly size = input<FlagSize>('sm');

  protected readonly imageAlt = computed(() => this.countryName() ?? FLAGS[this.countryCode()]);
  protected readonly imageSource = computed(() => {
    const code = this.countryCode();

    if (this.size() === 'lg') {
      return {
        src: getFlagPath(code, '40x30', 'png'),
        srcset: [
          getFlagPath(code, '40x30', 'png'),
          `${getFlagPath(code, '80x60', 'png')} 2x`,
          `${getFlagPath(code, '120x90', 'png')} 3x`,
        ].join(', '),
        width: 40,
        height: 30,
      };
    }

    return {
      src: getFlagPath(code, '20x15', 'png'),
      srcset: [
        getFlagPath(code, '20x15', 'png'),
        `${getFlagPath(code, '40x30', 'png')} 2x`,
        `${getFlagPath(code, '60x45', 'png')} 3x`,
      ].join(', '),
      width: 20,
      height: 15,
    };
  });
}
