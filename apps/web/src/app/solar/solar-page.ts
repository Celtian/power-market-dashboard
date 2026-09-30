import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-solar-page',
  template: `
    <section aria-labelledby="solar-title">
      <h1 id="solar-title" class="text-2xl font-bold">
        Solar production
      </h1>
      <p class="mt-2 opacity-80">
        Forecast and actual production visualization will appear here.
      </p>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SolarPage {}
