import { CdkPortalOutlet, Portal } from '@angular/cdk/portal';
import { Component, inject, input } from '@angular/core';

import { NgxFixedFooterDirective } from 'ngx-fixed-footer';

import { UI_I18N } from '../../../helpers/ui-i18n.provider';

@Component({
  selector: 'ui-bottom-navigation',
  imports: [CdkPortalOutlet, NgxFixedFooterDirective],
  templateUrl: './bottom-navigation.html',
})
export class BottomNavigation {
  protected readonly i18n = inject(UI_I18N);
  public readonly ariaLabel = input.required<string>();
  public readonly actionPortal = input<Portal<unknown> | null>(null);
  public readonly contentPortal = input<Portal<unknown> | null>(null);
  public readonly containerSelector = input('[role="main"]');
  public readonly mobileOnly = input(false);
}
