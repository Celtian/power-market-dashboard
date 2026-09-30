import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

import { TranslocoPipe } from '@jsverse/transloco';

import { Button } from '@power-market-dashboard/ui';

import { Logo } from '../components/logo/logo';

@Component({
  selector: 'app-not-found-page',
  imports: [Button, Logo, RouterLink, TranslocoPipe],
  templateUrl: './not-found-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-1 items-center justify-center py-8' },
})
export class NotFoundPage {
  public constructor() {
    const meta = inject(Meta);
    const previousRobotsContent = meta.getTag("name='robots'")?.content;

    meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
    inject(DestroyRef).onDestroy(() => {
      if (previousRobotsContent) {
        meta.updateTag({ name: 'robots', content: previousRobotsContent });
      } else {
        meta.removeTag("name='robots'");
      }
    });
  }
}
