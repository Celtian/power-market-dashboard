import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { TranslocoPipe } from '@jsverse/transloco';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { faSolidArrowsRotate } from '@ng-icons/font-awesome/solid';

import { ModalWrapper } from '@power-market-dashboard/ui';

@Component({
  selector: 'app-update-prompt',
  imports: [NgIcon, TranslocoPipe],
  templateUrl: './app-update-prompt.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideIcons({ faSolidArrowsRotate })],
  host: { class: 'w-80 max-w-full' },
  hostDirectives: [ModalWrapper],
})
export class AppUpdatePrompt {
  private readonly dialogRef = inject<DialogRef<boolean>>(DialogRef);

  protected dismiss(): void {
    this.dialogRef.close(false);
  }

  protected update(): void {
    this.dialogRef.close(true);
  }
}
