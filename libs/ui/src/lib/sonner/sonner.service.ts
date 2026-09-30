import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Injector, Service, Type, inject } from '@angular/core';

import { ExternalToast, PromiseData, PromiseT, toast } from 'ngx-sonner';

import { UI_OVERLAY_Z_INDEX } from '../helpers/overlay-layers';
import { SonnerToasterRegistry } from './sonner-toaster-registry';
import { SonnerToasterComponent } from './sonner-toaster.component';

@Service()
export class SonnerService {
  private readonly zIndex = `${UI_OVERLAY_Z_INDEX.toast}`;
  private readonly injector = inject(Injector);
  private readonly overlay = inject(Overlay);
  private readonly toasterRegistry = inject(SonnerToasterRegistry);
  private overlayRef?: OverlayRef;

  public show(
    message: string | Type<unknown>,
    data?: ExternalToast,
  ): string | number {
    this.ensureToaster();
    return toast(message, data);
  }

  public success(
    message: string | Type<unknown>,
    data?: ExternalToast,
  ): string | number {
    this.ensureToaster();
    return toast.success(message, data);
  }

  public info(
    message: string | Type<unknown>,
    data?: ExternalToast,
  ): string | number {
    this.ensureToaster();
    return toast.info(message, data);
  }

  public warning(
    message: string | Type<unknown>,
    data?: ExternalToast,
  ): string | number {
    this.ensureToaster();
    return toast.warning(message, data);
  }

  public error(
    message: string | Type<unknown>,
    data?: ExternalToast,
  ): string | number {
    this.ensureToaster();
    return toast.error(message, data);
  }

  public loading(
    message: string | Type<unknown>,
    data?: ExternalToast,
  ): string | number {
    this.ensureToaster();
    return toast.loading(message, data);
  }

  public promise<ToastData>(
    promise: PromiseT<ToastData>,
    data?: PromiseData<ToastData>,
  ): string | number | undefined {
    this.ensureToaster();
    return toast.promise(promise, data);
  }

  public custom<T>(component: Type<T>, data?: ExternalToast): string | number {
    this.ensureToaster();
    return toast.custom(component, data);
  }

  public dismiss(id?: number | string): string | number | undefined {
    return toast.dismiss(id);
  }

  private ensureToaster(): void {
    if (this.overlayRef || this.toasterRegistry.hasToaster()) {
      return;
    }

    this.overlayRef = this.overlay.create({
      hasBackdrop: false,
      panelClass: 'ui-sonner-overlay-pane',
      positionStrategy: this.overlay.position().global(),
    });
    this.overlayRef.hostElement.style.zIndex = this.zIndex;
    this.overlayRef.overlayElement.style.zIndex = this.zIndex;
    this.overlayRef.attach(
      new ComponentPortal(SonnerToasterComponent, null, this.injector),
    );
  }
}
