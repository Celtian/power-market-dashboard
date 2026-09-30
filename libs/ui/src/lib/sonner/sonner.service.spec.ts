import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { toast } from 'ngx-sonner';

import { UI_OVERLAY_Z_INDEX } from '../helpers/overlay-layers';
import { SonnerToasterRegistry } from './sonner-toaster-registry';
import { SonnerService } from './sonner.service';

vi.mock('ngx-sonner', () => {
  const toastMock = Object.assign(vi.fn(), {
    custom: vi.fn(),
    dismiss: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(),
    promise: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  });

  return {
    NgxSonnerToaster: class {},
    toast: toastMock,
  };
});

@Component({ template: '' })
class CustomToastComponent {}

describe('SonnerService', () => {
  let service: SonnerService;
  let overlayRef: {
    attach: ReturnType<typeof vi.fn>;
    hostElement: HTMLElement;
    overlayElement: HTMLElement;
  };
  let overlay: {
    create: ReturnType<typeof vi.fn>;
    position: ReturnType<typeof vi.fn>;
  };
  let registry: {
    hasToaster: ReturnType<typeof vi.fn>;
  };
  let globalPosition: object;

  beforeEach(() => {
    vi.clearAllMocks();
    globalPosition = {};
    overlayRef = {
      attach: vi.fn(),
      hostElement: document.createElement('div'),
      overlayElement: document.createElement('div'),
    };
    overlay = {
      create: vi.fn(() => overlayRef as unknown as OverlayRef),
      position: vi.fn(() => ({ global: vi.fn(() => globalPosition) })),
    };
    registry = {
      hasToaster: vi.fn(() => false),
    };
    TestBed.configureTestingModule({
      providers: [
        SonnerService,
        { provide: Overlay, useValue: overlay },
        { provide: SonnerToasterRegistry, useValue: registry },
      ],
    });
    service = TestBed.inject(SonnerService);
  });

  it.each([
    ['show', toast],
    ['success', toast.success],
    ['info', toast.info],
    ['warning', toast.warning],
    ['error', toast.error],
    ['loading', toast.loading],
  ] as const)(
    'should create a toaster and delegate %s notifications',
    (method, toastMethod) => {
      vi.mocked(toastMethod).mockReturnValue(17);
      const options = { description: 'Details' };

      const result = service[method]('Message', options);

      expect(result).toBe(17);
      expect(toastMethod).toHaveBeenCalledWith('Message', options);
      expect(overlay.create).toHaveBeenCalledWith({
        hasBackdrop: false,
        panelClass: 'ui-sonner-overlay-pane',
        positionStrategy: globalPosition,
      });
      expect(overlayRef.attach.mock.calls[0][0]).toBeInstanceOf(
        ComponentPortal,
      );
      expect(overlayRef.hostElement.style.zIndex).toBe(
        `${UI_OVERLAY_Z_INDEX.toast}`,
      );
      expect(overlayRef.overlayElement.style.zIndex).toBe(
        `${UI_OVERLAY_Z_INDEX.toast}`,
      );
    },
  );

  it('should create the overlay only once', () => {
    service.show('First');
    service.success('Second');

    expect(overlay.create).toHaveBeenCalledOnce();
    expect(overlayRef.attach).toHaveBeenCalledOnce();
  });

  it('should reuse an existing toaster registered by the application', () => {
    registry.hasToaster.mockReturnValue(true);

    service.info('Existing');

    expect(toast.info).toHaveBeenCalledWith('Existing', undefined);
    expect(overlay.create).not.toHaveBeenCalled();
  });

  it('should delegate promise and custom toasts', () => {
    const promise = Promise.resolve('done');
    const promiseOptions = { loading: 'Loading' };
    vi.mocked(toast.promise).mockReturnValue(21);
    vi.mocked(toast.custom).mockReturnValue(22);

    expect(service.promise(promise, promiseOptions)).toBe(21);
    expect(service.custom(CustomToastComponent, { duration: 1000 })).toBe(22);
    expect(toast.promise).toHaveBeenCalledWith(promise, promiseOptions);
    expect(toast.custom).toHaveBeenCalledWith(CustomToastComponent, {
      duration: 1000,
    });
    expect(overlay.create).toHaveBeenCalledOnce();
  });

  it('should dismiss without creating a toaster', () => {
    vi.mocked(toast.dismiss).mockReturnValue('toast-id');

    expect(service.dismiss('toast-id')).toBe('toast-id');
    expect(toast.dismiss).toHaveBeenCalledWith('toast-id');
    expect(overlay.create).not.toHaveBeenCalled();
  });
});
