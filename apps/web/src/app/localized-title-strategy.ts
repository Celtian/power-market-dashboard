import { Injectable, effect, inject, makeEnvironmentProviders, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

import { translateSignal } from '@jsverse/transloco';

const SITE_NAME = 'Power Market Dashboard';

@Injectable()
export class LocalizedTitleStrategy extends TitleStrategy {
  private readonly documentTitle = inject(Title);
  private readonly titleKey = signal('');
  private readonly translatedTitle = translateSignal(this.titleKey);

  public constructor() {
    super();

    effect(() => {
      const translatedTitle = this.translatedTitle();
      this.documentTitle.setTitle(
        translatedTitle ? `${translatedTitle} | ${SITE_NAME}` : SITE_NAME,
      );
    });
  }

  public override updateTitle(snapshot: RouterStateSnapshot): void {
    this.titleKey.set(this.buildTitle(snapshot) ?? '');
  }
}

export const provideLocalizedTitle = () =>
  makeEnvironmentProviders([{ provide: TitleStrategy, useClass: LocalizedTitleStrategy }]);
