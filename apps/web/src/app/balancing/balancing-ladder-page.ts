import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-balancing-ladder-page',
  template: `
    <section aria-labelledby="balancing-title">
      <h1 id="balancing-title" class="text-2xl font-bold">
        Balancing bid ladder
      </h1>
      <p class="mt-2 opacity-80">
        Regulatory energy bid ladder visualization will appear here.
      </p>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BalancingLadderPage {}
