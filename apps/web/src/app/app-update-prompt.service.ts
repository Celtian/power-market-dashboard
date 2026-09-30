import { Dialog } from '@angular/cdk/dialog';
import { Overlay } from '@angular/cdk/overlay';
import { DOCUMENT } from '@angular/common';
import { Service, inject } from '@angular/core';

@Service()
export class AppUpdatePromptService {
  private readonly dialog = inject(Dialog);
  private readonly document = inject(DOCUMENT);
  private readonly overlay = inject(Overlay);

  public async open(): Promise<void> {
    const { AppUpdatePrompt } = await import('./components/app-update-prompt/app-update-prompt');
    const dialogRef = this.dialog.open<boolean>(AppUpdatePrompt, {
      ariaDescribedBy: 'app-update-description',
      ariaLabelledBy: 'app-update-title',
      ariaModal: false,
      autoFocus: false,
      disableClose: false,
      hasBackdrop: false,
      maxWidth: 'calc(100vw - 1rem)',
      positionStrategy: this.overlay.position().global().left('0.5rem').bottom('0.5rem'),
      restoreFocus: true,
      role: 'dialog',
    });

    dialogRef.updatePosition();
    dialogRef.closed.subscribe((reload) => {
      if (reload) {
        this.document.location.reload();
      }
    });
  }
}
